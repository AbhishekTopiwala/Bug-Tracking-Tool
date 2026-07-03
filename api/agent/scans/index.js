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

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 401, 'Unauthorized');
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(idToken);
    const uid = decodedToken.user_id;

    if (req.method === 'POST') {
      // Create Scan
      const { appId, baseUrl, environment = 'staging', config = {}, projectId } = req.body;
      if (!appId || !baseUrl) return sendError(res, 400, 'appId and baseUrl are required');

      const scanData = {
        fields: {
          appId: { stringValue: appId },
          organizationId: { stringValue: appId },
          baseUrl: { stringValue: baseUrl },
          environment: { stringValue: environment },
          status: { stringValue: 'created' },
          createdAt: { timestampValue: new Date().toISOString() },
          createdBy: { stringValue: uid },
          config: {
            mapValue: {
              fields: {
                maxPages: { integerValue: String(config.maxPages || 20) },
                maxDepth: { integerValue: String(config.depth || config.maxDepth || 3) },
                emulateDevice: { stringValue: config.emulateDevice || 'Desktop Chrome' }
              }
            }
          }
        }
      };

      if (projectId) {
        scanData.fields.projectId = { stringValue: projectId };
      }

      const postUrl = `${FIRESTORE_BASE}/website_scans`;
      const postRes = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(scanData)
      });

      if (!postRes.ok) {
        const errBody = await postRes.text();
        console.error('Firestore Create Error:', errBody);
        throw new Error(`Failed to create scan document: ${errBody}`);
      }

      const createdDoc = await postRes.json();
      const scanId = createdDoc.name.split('/').pop();

      return res.status(201).json({
        scanId,
        appId,
        status: 'created',
        createdAt: scanData.fields.createdAt.timestampValue
      });

    } else if (req.method === 'GET') {
      // List Scans
      const { appId, limit = 20 } = req.query;
      if (!appId) return sendError(res, 400, 'appId is required');

      const queryPayload = {
        structuredQuery: {
          from: [{ collectionId: 'website_scans' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'appId' },
              op: 'EQUAL',
              value: { stringValue: appId }
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

      if (!getRes.ok) throw new Error('Failed to fetch scans');

      const results = await getRes.json();
      const scans = results
        .filter(r => r.document && r.document.fields)
        .map(r => {
          const doc = r.document;
          const scan = { scanId: doc.name.split('/').pop() };
          for (const [k, v] of Object.entries(doc.fields)) {
            scan[k] = fsValue(v);
          }
          return scan;
        });

      return res.status(200).json({ scans });
    } else {
      return sendError(res, 405, 'Method not allowed');
    }
  } catch (err) {
    console.error('Scan API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}
