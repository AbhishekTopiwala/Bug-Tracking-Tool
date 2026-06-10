/**
 * Vercel Serverless Function: /api/generate-bug-from-note
 * Replaces the Firebase Cloud Function `generateBugFromNote`.
 * POST body: { note, organizationId }
 * Header:    Authorization: Bearer <Firebase ID token>
 */

import {
  verifyFirebaseToken,
  checkAndIncrementQuota,
  generateGeminiContentWithRetry,
  setCorsHeaders,
  sendError,
  GoogleGenerativeAI,
} from './_geminiHelper.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method Not Allowed');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return sendError(res, 401, 'Missing Authorization token');

  let uid;
  try {
    ({ uid } = await verifyFirebaseToken(idToken));
  } catch {
    return sendError(res, 401, 'Invalid or expired token');
  }

  // ── Validate input ────────────────────────────────────────────────────────
  const { note, organizationId } = req.body || {};

  if (!note || typeof note !== 'string') {
    return sendError(res, 400, 'note is required and must be a string');
  }

  // ── Quota check ───────────────────────────────────────────────────────────
  try {
    await checkAndIncrementQuota(organizationId, idToken);
  } catch (err) {
    if (err.message === 'QUOTA_EXCEEDED') {
      return sendError(res, 429, 'AI generation quota exceeded for your organization.');
    }
    console.error('[generateBugFromNote] Quota error:', err.message);
  }

  // ── Gemini ────────────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendError(res, 500, 'GEMINI_API_KEY not configured on server');

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `You are a QA engineer assistant. Convert the short QA note into a formal bug report.
Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "title": "Clear, concise bug title",
  "description": "Detailed description of the bug",
  "stepsToReproduce": ["Step 1", "Step 2", "Step 3"],
  "expectedResult": "What should happen",
  "actualResult": "What actually happens",
  "priority": "High"
}

Priority must be one of: Low, Medium, High, Critical`;

  try {
    const result = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash-lite',
      systemInstruction,
      `QA Note: "${note}"`
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return res.status(200).json(JSON.parse(cleaned));
  } catch (error) {
    console.error('[generateBugFromNote] Gemini error:', error?.message);
    return sendError(res, 500, 'Failed to generate bug report. Please try again.');
  }
};
