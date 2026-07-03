import { verifyFirebaseToken, setCorsHeaders, sendError } from '../../_geminiHelper.js';

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function fsValue(field) {
  if (!field) return undefined;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.nullValue !== undefined) return null;
  if (field.arrayValue) {
    return (field.arrayValue.values || []).map(fsValue);
  }
  if (field.mapValue) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      out[k] = fsValue(v);
    }
    return out;
  }
  return undefined;
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 401, 'Unauthorized');
    }
    const idToken = authHeader.split('Bearer ')[1];
    await verifyFirebaseToken(idToken);

    const { runId } = req.query;
    if (!runId) return sendError(res, 400, 'runId is required');

    // 1. Fetch the run document
    const firestoreUrl = `${FIRESTORE_BASE}/agent_runs/${runId}`;
    const getRes = await fetch(firestoreUrl, {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    if (getRes.status === 404) return sendError(res, 404, 'Run not found');
    if (!getRes.ok) throw new Error('Failed to fetch run');

    const doc = await getRes.json();
    const run = { runId };
    
    if (doc.fields) {
      for (const [k, v] of Object.entries(doc.fields)) {
        run[k] = fsValue(v);
      }
    }

    // 2. Fetch the tests subcollection
    const testsUrl = `${FIRESTORE_BASE}/agent_runs/${runId}/tests`;
    const testsRes = await fetch(testsUrl, {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    if (testsRes.ok) {
      const testsData = await testsRes.json();
      run.tests = (testsData.documents || []).map(d => {
        const test = { id: d.name.split('/').pop() };
        for (const [k, v] of Object.entries(d.fields || {})) {
          test[k] = fsValue(v);
        }
        return test;
      });
    } else {
      run.tests = [];
    }

    return res.status(200).json(run);
  } catch (err) {
    console.error('Run Detail API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}
