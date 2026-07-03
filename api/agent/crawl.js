import { verifyFirebaseToken, setCorsHeaders, sendError, checkAndIncrementQuota } from '../_geminiHelper.js';

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
    const { uid } = await verifyFirebaseToken(idToken);

    const { url, config, projectId, organizationId } = req.body;
    if (!url || !organizationId) {
      return sendError(res, 400, 'URL and organizationId are required');
    }

    // Optional: check quota before crawling
    try {
      await checkAndIncrementQuota(organizationId, idToken);
    } catch (e) {
      if (e.message === 'QUOTA_EXCEEDED') {
        return sendError(res, 403, 'Monthly AI quota exceeded. Please upgrade your plan.');
      }
      console.warn('Quota check failed, proceeding anyway:', e.message);
    }

    // 1. Create a new document in agent_runs collection
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // We construct the Firestore REST document body
    const docData = {
      fields: {
        runId: { stringValue: runId },
        targetUrl: { stringValue: url },
        organizationId: { stringValue: organizationId },
        createdBy: { stringValue: uid },
        createdAt: { timestampValue: new Date().toISOString() },
        status: { stringValue: 'crawling' },
        currentStep: { stringValue: 'Initializing crawl...' },
        progress: { integerValue: "0" },
        config: {
          mapValue: {
            fields: {
              maxPages: { integerValue: String(config?.maxPages || 20) },
              depth: { integerValue: String(config?.depth || 3) }
            }
          }
        },
        crawlResult: {
          mapValue: { fields: {} }
        },
        testsGenerated: { integerValue: "0" },
        testsPassed: { integerValue: "0" },
        testsFailed: { integerValue: "0" },
        bugsGenerated: { integerValue: "0" }
      }
    };
    
    if (projectId) {
      docData.fields.projectId = { stringValue: projectId };
    }

    const firestoreUrl = `${FIRESTORE_BASE}/agent_runs?documentId=${runId}`;
    const createRes = await fetch(firestoreUrl, {
      method: 'POST', // Using POST with documentId query param acts like create
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(docData)
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Firestore create error:', errText);
      throw new Error('Failed to create run in Firestore');
    }

    // For Phase 1 (Stub Cloud Run execution), we'll artificially progress the state 
    // after a delay so the UI can demonstrate polling.
    // In production, you would publish to Pub/Sub or invoke Cloud Run here.
    
    // Fire and forget the actual AI crawler worker
    startCrawler(runId, idToken, url).catch(e => console.error("Crawler background error:", e));

    return res.status(200).json({ runId, status: 'crawling' });
  } catch (err) {
    console.error('Crawl API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}

/**
 * Autonomous AI Crawler
 * 1. Fetches HTML from the target URL
 * 2. Prunes the DOM (removes scripts/styles) to fit within LLM context
 * 3. Asks Gemini to construct a semantic Application Map
 * 4. Updates Firestore with the results
 */
async function startCrawler(runId, idToken, targetUrl) {
  const updateRun = async (fieldsToUpdate) => {
    const fieldPaths = Object.keys(fieldsToUpdate);
    const updateMask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
    const patchUrl = `${FIRESTORE_BASE}/agent_runs/${runId}?${updateMask}`;
    
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: fieldsToUpdate })
    });
  };

  try {
    await updateRun({ currentStep: { stringValue: "Fetching webpage content..." } });

    // 1. Fetch raw HTML
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Qualia-AI-Agent/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      // Timeout after 10s to prevent hanging
      signal: AbortSignal.timeout(10000)
    };
    
    const pageRes = await fetch(targetUrl, fetchOptions);
    if (!pageRes.ok) {
      throw new Error(`Failed to load target URL (Status: ${pageRes.status})`);
    }
    const htmlText = await pageRes.text();

    await updateRun({ 
      progress: { integerValue: "40" },
      currentStep: { stringValue: "Semantic DOM Parsing..." } 
    });

    // 2. Prune the DOM (very basic regex-based pruning for serverless limits)
    // Remove scripts, styles, SVGs, and comments to compress the payload
    let prunedHtml = htmlText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG ICON]')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ');

    // Truncate to avoid blowing up the Gemini context window (e.g. max 100k chars for safety)
    if (prunedHtml.length > 100000) {
      prunedHtml = prunedHtml.substring(0, 100000) + '... [TRUNCATED]';
    }

    await updateRun({ 
      progress: { integerValue: "70" },
      currentStep: { stringValue: "AI analyzing structural workflow..." } 
    });

    // 3. Ask Gemini to map the application
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
    
    const systemPrompt = `You are the Qualia AI Website Understanding Engine.
Your task is to analyze the provided pruned HTML DOM and reverse-engineer it into an Application Map.
Extract all interactive elements, forms, and potential workflows.
Output strictly as a valid JSON object matching this schema:
{
  "pagesFound": <number>,
  "pages": [
    {
      "url": "<the base url provided>",
      "title": "<inferred page title>",
      "forms": [
        {
          "purpose": "e.g., Login Form",
          "inputs": ["email", "password"],
          "submitButton": "Login"
        }
      ],
      "buttons": ["Clickable button texts"],
      "links": ["Discovered a href links"]
    }
  ]
}`;

    const { generateGeminiContentWithRetry } = await import('../_geminiHelper.js');
    const response = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash',
      systemPrompt,
      `Target URL: ${targetUrl}\n\nPruned HTML:\n${prunedHtml}`
    );

    const resultText = response.response.text();
    let parsedResult;
    try {
      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/) || resultText.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : resultText;
      parsedResult = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Failed to parse Gemini JSON, saving raw output.", e);
      parsedResult = { pagesFound: 1, rawAnalysis: resultText };
    }

    // Convert JS Object to Firestore Map Value format
    const formatFsMap = (obj) => {
      if (Array.isArray(obj)) {
        return { arrayValue: { values: obj.map(formatFsMap) } };
      }
      if (obj !== null && typeof obj === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(obj)) {
          fields[k] = formatFsMap(v);
        }
        return { mapValue: { fields } };
      }
      if (typeof obj === 'number') return { integerValue: String(obj) };
      if (typeof obj === 'boolean') return { booleanValue: obj };
      return { stringValue: String(obj) };
    };

    // 4. Update Firestore with final results
    await updateRun({
      status: { stringValue: "crawled" },
      progress: { integerValue: "100" },
      currentStep: { stringValue: "Crawl complete" },
      crawlResult: formatFsMap(parsedResult)
    });

  } catch (err) {
    console.error("AI Crawler error:", err);
    await updateRun({
      status: { stringValue: "failed" },
      currentStep: { stringValue: `Crawler Failed: ${err.message}` }
    }).catch(() => {});
  }
}
