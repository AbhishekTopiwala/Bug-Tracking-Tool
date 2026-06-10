/**
 * Vercel Serverless Function: /api/generate-test-cases
 * Replaces the Firebase Cloud Function `generateTestCases`.
 * POST body: { featureDescription, imageBase64?, imageMimeType?, organizationId }
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

  // Handle CORS preflight
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
  const { featureDescription, imageBase64, imageMimeType, organizationId } = req.body || {};

  if (!featureDescription && !imageBase64) {
    return sendError(res, 400, 'featureDescription or an image is required');
  }

  // ── Quota check ───────────────────────────────────────────────────────────
  try {
    await checkAndIncrementQuota(organizationId, idToken);
  } catch (err) {
    if (err.message === 'QUOTA_EXCEEDED') {
      return sendError(res, 429, 'AI generation quota exceeded for your organization.');
    }
    console.error('[generateTestCases] Quota error:', err.message);
    // Non-fatal — allow the call to continue if quota doc is missing
  }

  // ── Gemini ────────────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendError(res, 500, 'GEMINI_API_KEY not configured on server');

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `You are a QA engineer. Generate comprehensive test cases for the provided feature description or image of a website page.
Analyze the image or description carefully to list:
- Positive flows (successful operations, standard user behavior)
- Negative flows (validation errors, wrong inputs, invalid operations)
- Edge cases (boundary conditions, state transitions, unusual interactions, performance limits)

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "positive": [
    {"id": "TC-P1", "title": "Test case title", "steps": ["Step 1", "Step 2"], "expected": "Expected result"}
  ],
  "negative": [
    {"id": "TC-N1", "title": "Test case title", "steps": ["Step 1", "Step 2"], "expected": "Expected result"}
  ],
  "edge": [
    {"id": "TC-E1", "title": "Test case title", "steps": ["Step 1", "Step 2"], "expected": "Expected result"}
  ]
}`;

  const contents = [];
  if (imageBase64 && imageMimeType) {
    contents.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });
  }
  contents.push({ text: featureDescription || 'Generate test cases for this image.' });

  try {
    const result = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash-lite',
      systemInstruction,
      contents
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return res.status(200).json(JSON.parse(cleaned));
  } catch (error) {
    console.error('[generateTestCases] Gemini error:', error?.message);
    return sendError(res, 500, 'Failed to generate test cases. Please try again.');
  }
};
