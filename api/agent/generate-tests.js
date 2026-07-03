import { verifyFirebaseToken, setCorsHeaders, sendError } from '../../_geminiHelper.js';

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 401, 'Unauthorized');
    }
    const idToken = authHeader.split('Bearer ')[1];
    await verifyFirebaseToken(idToken);

    const { scanId, appId } = req.body;
    if (!scanId || !appId) return sendError(res, 400, 'scanId and appId are required');

    // 1. Update scan status to generating
    const patchUrl = `${FIRESTORE_BASE}/website_scans/${scanId}?updateMask.fieldPaths=status&updateMask.fieldPaths=currentStep`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'generating' },
          currentStep: { stringValue: 'Generating Playwright tests with Gemini...' }
        }
      })
    });

    // 2. Fire off background task for Playwright test generation
    startPlaywrightGeneration(scanId, appId, idToken).catch(e => console.error("Playwright gen error:", e));

    return res.status(200).json({ scanId, status: 'generating' });
  } catch (err) {
    console.error('Generate Tests API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}

/**
 * Autonomous AI Playwright Generation Engine
 * 1. Retrieves the Application Map (crawlResult) from website_scans
 * 2. Uses Gemini to generate Page Object Models and Playwright test specs
 * 3. Saves the resulting test cases in generated_test_cases
 */
async function startPlaywrightGeneration(scanId, appId, idToken) {
  const updateScan = async (fieldsToUpdate) => {
    const fieldPaths = Object.keys(fieldsToUpdate);
    const updateMask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
    const patchUrl = `${FIRESTORE_BASE}/website_scans/${scanId}?${updateMask}`;
    
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: fieldsToUpdate })
    });
  };

  try {
    // 1. Fetch the scan result (Application Map)
    const getScanUrl = `${FIRESTORE_BASE}/website_scans/${scanId}`;
    const scanRes = await fetch(getScanUrl, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    
    if (!scanRes.ok) throw new Error("Could not fetch scan data");
    const scanDoc = await scanRes.json();
    
    // We need the crawlResult
    const crawlResult = scanDoc.fields?.crawlResult;
    if (!crawlResult) throw new Error("No crawlResult found in scan");

    // Convert Firestore field map back to standard JSON string for Gemini
    const { fsValue } = await import('../../_geminiHelper.js');
    const appMap = JSON.stringify(fsValue(crawlResult), null, 2);

    await updateScan({ currentStep: { stringValue: 'AI designing Page Object Models...' } });

    // 2. Ask Gemini to generate Playwright architecture
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
    
    const systemPrompt = `You are an expert Playwright Architect.
Given an Application Map (JSON output from a web crawler), generate a complete Playwright E2E test scenario.
Design a Page Object Model (POM) and a Spec file that tests the primary workflows (e.g. login, navigation, form submission).
Output strictly as a valid JSON object matching this schema:
{
  "testTitle": "Primary E2E Workflow",
  "description": "Tests the main happy path discovered",
  "category": "E2E",
  "files": [
    {
      "filename": "pages/MainPage.ts",
      "content": "// Playwright POM code here..."
    },
    {
      "filename": "tests/main.spec.ts",
      "content": "// Playwright Spec code here..."
    }
  ]
}`;

    const { generateGeminiContentWithRetry } = await import('../../_geminiHelper.js');
    const response = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash',
      systemPrompt,
      `Application Map:\n${appMap}`
    );

    await updateScan({ currentStep: { stringValue: 'Parsing AI generated tests...' } });

    const resultText = response.response.text();
    let parsedResult;
    try {
      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/) || resultText.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : resultText;
      parsedResult = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Failed to parse Gemini JSON for tests.", e);
      throw new Error("AI returned invalid JSON format");
    }

    // 3. Save to generated_test_cases collection
    const testId = `test_${Date.now()}`;
    const createTestUrl = `${FIRESTORE_BASE}/generated_test_cases?documentId=${testId}`;
    
    // Format steps/files for Firestore
    const filesArray = (parsedResult.files || []).map(f => ({
      mapValue: {
        fields: {
          filename: { stringValue: f.filename },
          content: { stringValue: f.content }
        }
      }
    }));

    await fetch(createTestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          appId: { stringValue: appId },
          scanId: { stringValue: scanId },
          title: { stringValue: parsedResult.testTitle || "Generated Test" },
          description: { stringValue: parsedResult.description || "" },
          category: { stringValue: parsedResult.category || "General" },
          status: { stringValue: "draft" },
          files: { arrayValue: { values: filesArray } },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    // 4. Update scan status
    await updateScan({
      status: { stringValue: 'completed' },
      currentStep: { stringValue: 'Tests generated and saved' }
    });

  } catch (err) {
    console.error('Playwright Generation Error:', err);
    await updateScan({
      status: { stringValue: 'failed' },
      currentStep: { stringValue: `Generation Failed: ${err.message}` }
    }).catch(() => {});
  }
}
