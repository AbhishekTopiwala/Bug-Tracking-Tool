import { verifyFirebaseToken, setCorsHeaders, sendError } from '../../../_geminiHelper.js';

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { scanId, action } = req.query;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 401, 'Unauthorized');
    }
    const idToken = authHeader.split('Bearer ')[1];
    await verifyFirebaseToken(idToken); // Ensures user is authenticated

    const updateScanStatus = async (status) => {
      const patchUrl = `${FIRESTORE_BASE}/website_scans/${scanId}?updateMask.fieldPaths=status&updateMask.fieldPaths=${status}At`;
      const ts = new Date().toISOString();
      const payload = {
        fields: {
          status: { stringValue: status },
          [`${status}At`]: { timestampValue: ts }
        }
      };

      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!patchRes.ok) throw new Error(`Failed to update scan status to ${status}`);
      return ts;
    };

    if (req.method === 'POST') {
      switch (action) {
        case 'start': {
          const startedAt = await updateScanStatus('running');
          // In a real implementation, you would push this to a Cloud Task queue or invoke the agent worker here.
          return res.status(200).json({ scanId, status: 'running', startedAt, message: 'Scan dispatched successfully.' });
        }
        case 'pause': {
          const pausedAt = await updateScanStatus('paused');
          return res.status(200).json({ scanId, status: 'paused', pausedAt, message: 'Agent execution paused.' });
        }
        case 'resume': {
          const resumedAt = await updateScanStatus('running');
          return res.status(200).json({ scanId, status: 'running', resumedAt, message: 'Agent execution resumed.' });
        }
        case 'cancel': {
          const cancelledAt = await updateScanStatus('cancelled');
          return res.status(200).json({ scanId, status: 'cancelled', cancelledAt, message: 'Scan cancelled.' });
        }
        default:
          return sendError(res, 404, `Action ${action} not supported for POST`);
      }
    } else if (req.method === 'GET') {
      switch (action) {
        case 'progress': {
          const getUrl = `${FIRESTORE_BASE}/website_scans/${scanId}`;
          const getRes = await fetch(getUrl, {
            headers: { Authorization: `Bearer ${idToken}` }
          });
          if (!getRes.ok) return sendError(res, 404, 'Scan not found');
          
          const data = await getRes.json();
          const scan = { scanId };
          if (data.fields) {
            for (const [k, v] of Object.entries(data.fields)) {
              // Quick inline fsValue logic
              const fsValue = (field) => {
                if (!field) return undefined;
                if (field.integerValue !== undefined) return Number(field.integerValue);
                if (field.doubleValue !== undefined) return Number(field.doubleValue);
                if (field.stringValue !== undefined) return field.stringValue;
                if (field.booleanValue !== undefined) return field.booleanValue;
                if (field.timestampValue !== undefined) return field.timestampValue;
                if (field.nullValue !== undefined) return null;
                if (field.arrayValue) return (field.arrayValue.values || []).map(fsValue);
                if (field.mapValue) {
                  const out = {};
                  for (const [mk, mv] of Object.entries(field.mapValue.fields || {})) out[mk] = fsValue(mv);
                  return out;
                }
                return undefined;
              };
              scan[k] = fsValue(v);
            }
          }
          return res.status(200).json(scan);
        }
        case 'tests': {
          const queryPayload = {
            structuredQuery: {
              from: [{ collectionId: 'generated_test_cases' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'scanId' },
                  op: 'EQUAL',
                  value: { stringValue: scanId }
                }
              }
            }
          };
          const queryUrl = `${FIRESTORE_BASE}:runQuery`;
          const queryRes = await fetch(queryUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify(queryPayload)
          });
          if (!queryRes.ok) throw new Error('Failed to fetch tests');
          
          const results = await queryRes.json();
          const tests = results
            .filter(r => r.document && r.document.fields)
            .map(r => {
              const doc = r.document;
              const test = { id: doc.name.split('/').pop() };
              for (const [k, v] of Object.entries(doc.fields)) {
                // Inline fsValue logic
                const fsValue = (field) => {
                  if (!field) return undefined;
                  if (field.integerValue !== undefined) return Number(field.integerValue);
                  if (field.stringValue !== undefined) return field.stringValue;
                  if (field.booleanValue !== undefined) return field.booleanValue;
                  if (field.timestampValue !== undefined) return field.timestampValue;
                  if (field.arrayValue) return (field.arrayValue.values || []).map(fsValue);
                  if (field.mapValue) {
                    const out = {};
                    for (const [mk, mv] of Object.entries(field.mapValue.fields || {})) out[mk] = fsValue(mv);
                    return out;
                  }
                  return undefined;
                };
                test[k] = fsValue(v);
              }
              return test;
            });
          return res.status(200).json({ tests });
        }
        case 'bugs': {
          // List bugs associated with this scan/app
          return res.status(200).json({ data: [], nextPageToken: null });
        }
        case 'report': {
          // Generate a signed URL for the report
          return res.status(200).json({
            scanId,
            format: req.query.format || 'json',
            downloadUrl: 'https://storage.googleapis.com/... (mock signed url)',
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          });
        }
        case 'logs': {
          // Fetch from executions/{executionId}/execution_logs
          return res.status(200).json({ logs: [], nextPageToken: null });
        }
        default:
          return sendError(res, 404, `Action ${action} not supported for GET`);
      }
    } else {
      return sendError(res, 405, 'Method not allowed');
    }
  } catch (err) {
    console.error(`Scan Action [${action}] Error:`, err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}
