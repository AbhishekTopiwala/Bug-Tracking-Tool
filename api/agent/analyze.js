import { verifyFirebaseToken, setCorsHeaders, sendError, generateGeminiContentWithRetry, GoogleGenerativeAI } from '../../_geminiHelper.js';

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

    const { runId } = req.body;
    if (!runId) return sendError(res, 400, 'runId is required');

    // Update run status to analyzing_failures
    const patchUrl = `${FIRESTORE_BASE}/agent_runs/${runId}?updateMask.fieldPaths=status&updateMask.fieldPaths=currentStep`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'analyzing_failures' },
          currentStep: { stringValue: 'Diagnosing failures with Gemini...' }
        }
      })
    });

    // Start background analysis process
    analyzeFailures(runId, idToken).catch(err => console.error("Background analysis failed:", err));

    return res.status(200).json({ runId, status: 'analyzing_failures' });
  } catch (err) {
    console.error('Analyze API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}

async function analyzeFailures(runId, idToken) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);

    // Fetch tests to find failed ones
    const testsUrl = `${FIRESTORE_BASE}/agent_runs/${runId}/tests`;
    const testsRes = await fetch(testsUrl, { headers: { Authorization: `Bearer ${idToken}` }});
    const testsData = await testsRes.json();
    
    let failuresAnalyzed = 0;

    if (testsData.documents) {
      for (const doc of testsData.documents) {
        const fields = doc.fields || {};
        const status = fields.status?.stringValue;

        if (status === 'failed') {
          const testId = doc.name.split('/').pop();
          const testName = fields.name?.stringValue || "Unknown test";
          const consoleLogs = fields.consoleLogs?.arrayValue?.values?.map(v => v.stringValue) || [];
          
          if (consoleLogs.length === 0) continue;

          // Build prompt for Gemini
          const prompt = `
          You are an expert QA Engineer and Debugger. Analyze the following failed test and determine the root cause, severity, and recommendation.
          
          Test Name: ${testName}
          Logs:
          ${consoleLogs.join('\n')}
          
          Provide the output as a valid JSON object with the exact keys:
          - rootCause (string)
          - severity (string: "Low", "Medium", "High", "Critical")
          - recommendation (string)
          `;

          const response = await generateGeminiContentWithRetry(
            genAI,
            'gemini-2.5-flash',
            'You are an expert QA Engineer AI. Always return strict JSON without markdown backticks.',
            prompt
          );

          let analysisResult;
          try {
            const text = response.response.text().replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            analysisResult = JSON.parse(text);
          } catch (parseError) {
            console.error("Failed to parse Gemini JSON:", parseError);
            analysisResult = {
              rootCause: "Could not parse AI analysis.",
              severity: "Medium",
              recommendation: "Check manual logs."
            };
          }
          
          // Update the test document with aiAnalysis
          const patchTestUrl = `${FIRESTORE_BASE}/agent_runs/${runId}/tests/${testId}?updateMask.fieldPaths=aiAnalysis`;
          await fetch(patchTestUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              fields: {
                aiAnalysis: {
                  mapValue: {
                    fields: {
                      rootCause: { stringValue: analysisResult.rootCause || "Unknown" },
                      severity: { stringValue: analysisResult.severity || "Medium" },
                      recommendation: { stringValue: analysisResult.recommendation || "N/A" }
                    }
                  }
                }
              }
            })
          });

          failuresAnalyzed++;
        }
      }
    }

    // Update the run status to completed
    const updateMask = 'updateMask.fieldPaths=status&updateMask.fieldPaths=currentStep&updateMask.fieldPaths=progress&updateMask.fieldPaths=bugsGenerated';
    const patchUrl = `${FIRESTORE_BASE}/agent_runs/${runId}?${updateMask}`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'completed' },
          currentStep: { stringValue: 'Run complete' },
          progress: { integerValue: "100" },
          bugsGenerated: { integerValue: String(failuresAnalyzed) }
        }
      })
    });

  } catch (err) {
    console.error('Analysis error:', err);
  }
}
