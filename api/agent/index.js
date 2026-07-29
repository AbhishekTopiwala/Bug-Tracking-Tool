import { 
  verifyFirebaseToken, 
  setCorsHeaders, 
  sendError, 
  checkAndIncrementQuota, 
  generateGeminiContentWithRetry, 
  GoogleGenerativeAI 
} from '../_geminiHelper.js';

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Convert a Firestore field value object to a plain JS value.
 */
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

  // Parse route and query from req.url
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const routeSegments = pathname.split('/').filter(Boolean);
  const route = routeSegments.slice(2);

  const query = {};
  for (const [k, v] of parsedUrl.searchParams.entries()) {
    query[k] = v;
  }

  console.log(`[Agent Route] ${req.method} ${pathname}`);

  if (!route || route.length === 0) {
    return sendError(res, 400, 'Invalid agent route');
  }

  const primarySegment = route[0];

  try {
    switch (primarySegment) {
      case 'analyze':
        return await handleAnalyze(req, res);
      case 'crawl':
        return await handleCrawl(req, res);
      case 'execute':
        return await handleExecute(req, res);
      case 'generate-tests':
        return await handleGenerateTests(req, res);
      case 'runs':
        if (route.length === 1) {
          return await handleListRuns(req, res, query);
        } else {
          const runId = route[1];
          return await handleGetRun(req, res, runId);
        }
      case 'scans':
        if (route.length === 1) {
          return await handleScansIndex(req, res, query);
        } else {
          const scanId = route[1];
          const action = route[2];
          return await handleScanAction(req, res, scanId, action, query);
        }
      case 'status': {
        const runId = route[1];
        return await handleGetStatus(req, res, runId);
      }
      default:
        return sendError(res, 404, `Not Found: /api/agent/${route.join('/')}`);
    }
  } catch (err) {
    console.error(`Agent Route Error [${route.join('/')}]:`, err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}

// ── 1. ANALYZE (api/agent/analyze.js) ────────────────────────────────────────

async function handleAnalyze(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

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

// ── 2. CRAWL (api/agent/crawl.js) ───────────────────────────────────────────

async function handleCrawl(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

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

  // Create a new document in agent_runs collection
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
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
    method: 'POST',
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

  // Fire and forget the actual AI crawler worker
  startCrawler(runId, idToken, url).catch(e => console.error("Crawler background error:", e));

  return res.status(200).json({ runId, status: 'crawling' });
}

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

    // Fetch raw HTML
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Qualia-AI-Agent/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
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

    // Prune the DOM
    let prunedHtml = htmlText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG ICON]')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ');

    if (prunedHtml.length > 100000) {
      prunedHtml = prunedHtml.substring(0, 100000) + '... [TRUNCATED]';
    }

    await updateRun({ 
      progress: { integerValue: "70" },
      currentStep: { stringValue: "AI analyzing structural workflow..." } 
    });

    // Ask Gemini to map the application
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

    // Update Firestore with final results
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

// ── 3. EXECUTE (api/agent/execute.js) ───────────────────────────────────────

async function handleExecute(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

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
      const doc = testsData.documents[0];
      const testId = doc.name.split('/').pop();
      
      // Update test to failed
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

// ── 4. GENERATE TESTS (api/agent/generate-tests.js) ─────────────────────────

async function handleGenerateTests(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  await verifyFirebaseToken(idToken);

  const { scanId, appId } = req.body;
  if (!scanId || !appId) return sendError(res, 400, 'scanId and appId are required');

  // Update scan status to generating
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

  // Fire off background task for Playwright test generation
  startPlaywrightGeneration(scanId, appId, idToken).catch(e => console.error("Playwright gen error:", e));

  return res.status(200).json({ scanId, status: 'generating' });
}

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
    // Fetch the scan result (Application Map)
    const getScanUrl = `${FIRESTORE_BASE}/website_scans/${scanId}`;
    const scanRes = await fetch(getScanUrl, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    
    if (!scanRes.ok) throw new Error("Could not fetch scan data");
    const scanDoc = await scanRes.json();
    
    const crawlResult = scanDoc.fields?.crawlResult;
    if (!crawlResult) throw new Error("No crawlResult found in scan");

    // Convert Firestore field map back to standard JSON string for Gemini
    const appMap = JSON.stringify(fsValue(crawlResult), null, 2);

    await updateScan({ currentStep: { stringValue: 'AI designing Page Object Models...' } });

    // Ask Gemini to generate Playwright architecture
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

    // Save to generated_test_cases collection
    const testId = `test_${Date.now()}`;
    const createTestUrl = `${FIRESTORE_BASE}/generated_test_cases?documentId=${testId}`;
    
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

    // Update scan status
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

// ── 5. LIST RUNS (api/agent/runs/index.js) ──────────────────────────────────

async function handleListRuns(req, res, query) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  await verifyFirebaseToken(idToken);

  const { orgId, limit = 20 } = query;
  if (!orgId) return sendError(res, 400, 'orgId is required');

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
}

// ── 6. GET RUN (api/agent/runs/[runId].js) ──────────────────────────────────

async function handleGetRun(req, res, runId) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  await verifyFirebaseToken(idToken);

  if (!runId) return sendError(res, 400, 'runId is required');

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

  // Fetch the tests subcollection
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
}

// ── 7. SCANS INDEX (api/agent/scans/index.js) ────────────────────────────────

async function handleScansIndex(req, res, query) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await verifyFirebaseToken(idToken);
  const uid = decodedToken.uid || decodedToken.user_id;

  if (req.method === 'POST') {
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
    const { appId, limit = 20 } = query;
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
}

// ── 8. SCAN ACTION (api/agent/scans/[scanId]/[action].js) ───────────────────

async function handleScanAction(req, res, scanId, action, query) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  await verifyFirebaseToken(idToken);

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
              test[k] = fsValue(v);
            }
            return test;
          });
        return res.status(200).json({ tests });
      }
      case 'bugs': {
        return res.status(200).json({ data: [], nextPageToken: null });
      }
      case 'report': {
        return res.status(200).json({
          scanId,
          format: query.format || 'json',
          downloadUrl: 'https://storage.googleapis.com/... (mock signed url)',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        });
      }
      case 'logs': {
        return res.status(200).json({ logs: [], nextPageToken: null });
      }
      default:
        return sendError(res, 404, `Action ${action} not supported for GET`);
    }
  } else {
    return sendError(res, 405, 'Method not allowed');
  }
}

// ── 9. GET STATUS (api/agent/status/[runId].js) ──────────────────────────────

async function handleGetStatus(req, res, runId) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  await verifyFirebaseToken(idToken);

  if (!runId) return sendError(res, 400, 'runId is required');

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

  return res.status(200).json(run);
}
