/**
 * _geminiHelper.js
 * Shared utilities for all Vercel Gemini API routes.
 * - Firebase Auth token verification via Firebase REST API
 * - Firestore quota check & increment (via Firebase REST API, no Admin SDK needed)
 * - Gemini content generation with retry + model fallback
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Firebase REST helpers (no Admin SDK — avoids billing requirement) ──────────

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Verify a Firebase ID token using Google's tokeninfo endpoint.
 * Returns { uid, email } on success, throws on failure.
 */
async function verifyFirebaseToken(idToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.users || data.users.length === 0) {
    throw new Error('Invalid or expired Firebase token');
  }
  const user = data.users[0];
  return { uid: user.localId, email: user.email };
}

/**
 * Read a Firestore document via REST.
 * Returns the raw Firestore document JSON, or null if not found.
 */
async function firestoreGet(path, idToken) {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore GET failed (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * Convert a Firestore field value object to a plain JS value.
 */
function fsValue(field) {
  if (!field) return undefined;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.mapValue) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      out[k] = fsValue(v);
    }
    return out;
  }
  return undefined;
}

/**
 * Check the org's AI quota and increment usage using a Firestore PATCH via REST.
 * Throws if quota is exceeded.
 */
async function checkAndIncrementQuota(orgId, idToken) {
  if (!orgId) throw new Error('Organization ID missing');

  const doc = await firestoreGet(`organizations/${orgId}`, idToken);
  if (!doc) return; // Org doc doesn't exist yet — allow

  const fields = doc.fields || {};
  const sub = fsValue(fields.subscription) || {};
  const aiUsage = fsValue(fields.aiUsage) || {};

  const currentUsage = typeof sub.aiUsed === 'number' ? sub.aiUsed : (aiUsage.currentUsage || 0);
  const monthlyLimit = typeof sub.aiQuota === 'number' ? sub.aiQuota : (aiUsage.monthlyLimit || 50);

  if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
    throw new Error('QUOTA_EXCEEDED');
  }

  const newUsage = currentUsage + 1;

  // PATCH only the two usage fields
  const patchUrl =
    `${FIRESTORE_BASE}/organizations/${orgId}` +
    `?updateMask.fieldPaths=subscription.aiUsed` +
    `&updateMask.fieldPaths=aiUsage.currentUsage`;

  await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        subscription: {
          mapValue: {
            fields: {
              aiUsed: { integerValue: String(newUsage) },
            },
          },
        },
        aiUsage: {
          mapValue: {
            fields: {
              currentUsage: { integerValue: String(newUsage) },
            },
          },
        },
      },
    }),
  });
}

// ── Gemini retry helper ────────────────────────────────────────────────────────

/**
 * Call Gemini with exponential back-off and model fallback.
 * Alternates between gemini-2.5-flash-lite and gemini-2.5-flash on transient errors.
 */
async function generateGeminiContentWithRetry(
  genAI,
  defaultModel,
  systemInstruction,
  contents,
  maxRetries = 3
) {
  let currentModel = defaultModel;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: currentModel, systemInstruction });
      const result = await model.generateContent(contents);
      return result;
    } catch (error) {
      console.error(`[Gemini attempt ${attempt}] model=${currentModel}:`, error?.message);

      const status = error?.status;
      const isTransient =
        status === 503 ||
        status === 429 ||
        error.message?.includes('503') ||
        error.message?.includes('429') ||
        error.message?.includes('high demand');

      if (isTransient && attempt < maxRetries) {
        currentModel =
          currentModel === 'gemini-2.5-flash-lite' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';
        console.warn(`[Gemini retry] Retrying in ${delay}ms with model: ${currentModel}`);
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.round(delay * 1.5);
      } else {
        throw error;
      }
    }
  }
}

// ── CORS & common response helpers ────────────────────────────────────────────

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

export {
  verifyFirebaseToken,
  checkAndIncrementQuota,
  generateGeminiContentWithRetry,
  setCorsHeaders,
  sendError,
  GoogleGenerativeAI,
};
