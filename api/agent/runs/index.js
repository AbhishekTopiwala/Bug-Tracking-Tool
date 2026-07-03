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

    const { orgId, limit = 20 } = req.query;
    if (!orgId) return sendError(res, 400, 'orgId is required');

    // Run a structured query using REST
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: 'agent_runs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'organizationId' },
            op: 'EQUAL',
            value: { stringValue: orgId }
          }
        },
        orderBy: [{
          field: { fieldPath: 'createdAt' },
          direction: 'DESCENDING'
        }],
        limit: parseInt(limit, 10)
      }
    };

    const queryUrl = `${FIRESTORE_BASE}:runQuery`;
    const getRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(queryPayload)
    });

    if (!getRes.ok) throw new Error('Failed to fetch runs');

    const results = await getRes.json();
    const runs = results
      .filter(r => r.document && r.document.fields)
      .map(r => {
        const doc = r.document;
        const run = { runId: doc.name.split('/').pop() };
        for (const [k, v] of Object.entries(doc.fields)) {
          run[k] = fsValue(v);
        }
        return run;
      });

    return res.status(200).json({ runs });
  } catch (err) {
    console.error('List runs API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}
