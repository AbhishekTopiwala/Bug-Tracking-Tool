/**
 * Vercel Serverless Function: /api/suggest-similar-bugs
 * Replaces the Firebase Cloud Function `suggestSimilarBugs`.
 * POST body: { title, existingBugs, organizationId }
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
  const { title, existingBugs, organizationId } = req.body || {};

  if (!title || typeof title !== 'string') {
    return sendError(res, 400, 'title is required and must be a string');
  }

  if (!existingBugs || existingBugs.length === 0) {
    return res.status(200).json([]);
  }

  // ── Quota check ───────────────────────────────────────────────────────────
  try {
    await checkAndIncrementQuota(organizationId, idToken);
  } catch (err) {
    if (err.message === 'QUOTA_EXCEEDED') {
      return sendError(res, 429, 'AI generation quota exceeded for your organization.');
    }
    console.error('[suggestSimilarBugs] Quota error:', err.message);
  }

  // ── Gemini ────────────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return sendError(res, 500, 'GEMINI_API_KEY not configured on server');

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `Given a new bug title, analyze the provided list of existing bugs and identify any that are highly similar or duplicates.
Return ONLY a JSON array containing the IDs of the most similar bugs (maximum 3). Example: ["bug1", "bug2"]
If no existing bugs are similar, return: []`;

  const bugList = (existingBugs || [])
    .slice(0, 20)
    .map((b) => `ID: ${b.id} | Title: ${b.title}`)
    .join('\n');

  try {
    const result = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash-lite',
      systemInstruction,
      `New bug title: "${title}"\n\nExisting bugs:\n${bugList}`
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return res.status(200).json(JSON.parse(cleaned));
  } catch (error) {
    console.error('[suggestSimilarBugs] Gemini error:', error?.message);
    return sendError(res, 500, 'Failed to suggest similar bugs. Please try again.');
  }
};
