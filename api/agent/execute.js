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

    const { runId, testIds } = req.body;
    if (!runId) return sendError(res, 400, 'runId is required');

    // Update run status to executing
    const patchUrl = `${FIRESTORE_BASE}/agent_runs/${runId}?updateMask.fieldPaths=status&updateMask.fieldPaths=currentStep`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'executing' },
          currentStep: { stringValue: 'Starting Playwright browser cluster...' }
        }
      })
    });

    simulateExecution(runId, idToken);

    return res.status(200).json({ runId, status: 'executing' });
  } catch (err) {
    console.error('Execute Tests API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}

async function simulateExecution(runId, idToken) {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  
  try {
    await delay(3000);
    
    // First, fetch the tests to update them
    const testsUrl = `${FIRESTORE_BASE}/agent_runs/${runId}/tests`;
    const testsRes = await fetch(testsUrl, { headers: { Authorization: `Bearer ${idToken}` }});
    const testsData = await testsRes.json();
    
    if (testsData.documents && testsData.documents.length > 0) {
      const doc = testsData.documents[0]; // just update the first one for the stub
      const testId = doc.name.split('/').pop();
      
      // Update test to failed (so we can demonstrate analyze_failures)
      const patchTestUrl = `${FIRESTORE_BASE}/agent_runs/${runId}/tests/${testId}?updateMask.fieldPaths=status&updateMask.fieldPaths=duration&updateMask.fieldPaths=consoleLogs`;
      await fetch(patchTestUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          fields: {
            status: { stringValue: 'failed' },
            duration: { integerValue: "2450" },
            consoleLogs: {
              arrayValue: {
                values: [
                  { stringValue: "[Playwright] Navigating to /login" },
                  { stringValue: "[Playwright] Error: Timeout 2000ms exceeded while waiting for selector \"input[name='email']\"" }
                ]
              }
            }
          }
        })
      });
    }

    await delay(1000);
    // Update the run status to executed
    const updateMask = 'updateMask.fieldPaths=status&updateMask.fieldPaths=currentStep&updateMask.fieldPaths=testsFailed&updateMask.fieldPaths=progress';
    const patchUrl = `${FIRESTORE_BASE}/agent_runs/${runId}?${updateMask}`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'executed' },
          currentStep: { stringValue: 'Execution complete' },
          progress: { integerValue: "70" },
          testsFailed: { integerValue: "1" }
        }
      })
    });

  } catch (err) {
    console.error('Simulation error:', err);
  }
}
