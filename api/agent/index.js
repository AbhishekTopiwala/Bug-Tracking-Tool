import { GoogleGenerativeAI, generateGeminiContentWithRetry, setCorsHeaders, sendError } from '../_geminiHelper.js';
import { executeTestPlan } from '../_playwrightScreenshot.js';

// Global cache for active serverless instance
const runCache = new Map();

/**
 * Perform server-side fetch of target URL to extract real DOM metadata & interactive elements
 */
async function fetchTargetDomSnapshot(targetUrl) {
  const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const status = res.status;

    if (!res.ok) {
      return {
        success: false,
        status,
        url: cleanUrl,
        error: `HTTP ${status} (${res.statusText || 'Error response from target site'})`,
      };
    }

    const html = await res.text();

    // Extract Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Web Page';

    // Extract Headings (h1, h2, h3)
    const headings = [];
    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 8) {
      const cleanH = hMatch[1].replace(/<[^>]+>/g, '').trim();
      if (cleanH) headings.push(cleanH);
    }

    // Extract Inputs (input, textarea, select)
    const inputs = [];
    const inputRegex = /<(input|textarea|select)([^>]*)\/?>/gi;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(html)) !== null && inputs.length < 15) {
      const tag = inputMatch[1].toLowerCase();
      const attrsStr = inputMatch[2];

      const getAttr = (name) => {
        const m = attrsStr.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
        return m ? m[1] : '';
      };

      const name = getAttr('name');
      const id = getAttr('id');
      const type = getAttr('type') || (tag === 'textarea' ? 'textarea' : 'text');
      const placeholder = getAttr('placeholder');
      const ariaLabel = getAttr('aria-label');
      const className = getAttr('class').split(' ')[0] || '';

      if (type === 'hidden') continue;

      let selector = '';
      if (id) selector = `#${id}`;
      else if (name) selector = `${tag}[name="${name}"]`;
      else if (placeholder) selector = `${tag}[placeholder="${placeholder}"]`;
      else if (className) selector = `${tag}.${className}`;
      else selector = tag;

      inputs.push({
        tag,
        type,
        name: name || undefined,
        id: id || undefined,
        placeholder: placeholder || undefined,
        ariaLabel: ariaLabel || undefined,
        selector,
      });
    }

    // Extract Buttons and Links
    const buttons = [];
    const btnRegex = /<(button|a|input)[^>]*?(type=["'](?:submit|button)["']|class=["'][^"']*(?:btn|button|cta)[^"']*["']|role=["']button["']|href=["'][^"']*["'])[^>]*>(?:([\s\S]*?)<\/(?:\1|button|a)>)?/gi;
    let btnMatch;
    while ((btnMatch = btnRegex.exec(html)) !== null && buttons.length < 15) {
      const tag = btnMatch[1].toLowerCase();
      const attrs = btnMatch[0];
      const innerText = btnMatch[3] ? btnMatch[3].replace(/<[^>]+>/g, '').trim() : '';

      const getId = attrs.match(/id=["']([^"']*)["']/i);
      const getHref = attrs.match(/href=["']([^"']*)["']/i);
      const getClass = attrs.match(/class=["']([^"']*)["']/i);
      const getType = attrs.match(/type=["']([^"']*)["']/i);

      let selector = '';
      if (getId) selector = `#${getId[1]}`;
      else if (getType && getType[1] === 'submit') selector = `${tag}[type="submit"]`;
      else if (innerText) selector = `${tag}:contains("${innerText.slice(0, 20)}")`;
      else if (getHref) selector = `a[href="${getHref[1]}"]`;
      else selector = `${tag}.${getClass ? getClass[1].split(' ')[0] : ''}`;

      if (innerText || getId || getHref || getType) {
        buttons.push({
          tag,
          type: getType ? getType[1] : undefined,
          text: innerText ? innerText.slice(0, 30) : undefined,
          href: getHref ? getHref[1] : undefined,
          selector,
        });
      }
    }

    return {
      success: true,
      status,
      url: cleanUrl,
      title,
      headings,
      inputs,
      buttons,
    };
  } catch (err) {
    return {
      success: false,
      url: targetUrl,
      error: err.message || 'Network timeout or unreachable domain',
    };
  }
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

  const url = req.url || '';

  try {
    // POST /api/agent/scans - Create new run from URL & Instructions
    if (req.method === 'POST' && (url.endsWith('/scans') || url.endsWith('/run'))) {
      const { targetUrl, instructions, moduleCategory, organizationId, userId, projectId } = req.body || {};

      if (!targetUrl || !instructions) {
        return sendError(res, 400, 'targetUrl and instructions are required');
      }

      // 1. Fetch real target website DOM snapshot (CORS-free backend inspection)
      const domSnapshot = await fetchTargetDomSnapshot(targetUrl);

      let plannedSteps = [];
      let runStatus = 'completed';

      if (!domSnapshot.success) {
        // Target URL failed HTTP fetch / connection error
        runStatus = 'failed';
        plannedSteps = [
          {
            stepId: 1,
            action: 'navigate',
            description: `Attempted HTTP connection to ${targetUrl}`,
            targetElementHint: 'window.location',
            status: 'failed',
            error: domSnapshot.error || 'Connection Failed',
            logs: `[DOM Inspector] GET ${targetUrl} failed: ${domSnapshot.error}`,
          },
          {
            stepId: 2,
            action: 'assertText',
            description: 'Assert server connectivity & HTTP response status',
            expectedText: '200 OK',
            targetElementHint: 'http.response',
            status: 'failed',
            error: `Target server unreachable: ${domSnapshot.error}`,
            logs: `[DOM Inspector] Assertion failed: Website returned non-200 status code.`,
          },
        ];
      } else if (genAI) {
        try {
          const systemPrompt = `You are an expert AI QA Automation Engineer.
You inspect REAL web page DOM snapshots and generate precise browser automation steps.

CRITICAL RULES — follow ALL of these exactly:
1. Use the EXACT CSS selectors from the DOM snapshot for targetElementHint.
2. For "type" actions, the "value" field MUST contain the EXACT text/credential the user specified in their instructions. NEVER use placeholder text like "Automation Testing Data", "qa_user@example.com", or "Sample Value". Extract the real value from the user's instruction.
3. For password fields, use the EXACT password the user provided. Do NOT use bullet dots or placeholders.
4. If the user mentions specific credentials (employee code, username, email, password, PIN, etc.), those exact strings MUST appear as the "value" for the matching type step.
5. Generate steps that reflect what a real QA tester would do following the user's instructions literally.

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "stepId": 1,
    "action": "navigate | click | type | assertText | hover | select",
    "description": "Clear description of what is being done",
    "targetElementHint": "Exact CSS selector from DOM snapshot (e.g. '#employee-code', 'input[name=\"password\"]')",
    "value": "EXACT value from user instructions for type actions — never use placeholder text",
    "expectedText": "Expected text for assertText actions",
    "logs": "Realistic browser console log"
  }
]`;

          const prompt = `Target Website URL: ${targetUrl}
Page Title: "${domSnapshot.title}"
Headings Found: ${JSON.stringify(domSnapshot.headings)}
Form Inputs Found in DOM: ${JSON.stringify(domSnapshot.inputs)}
Buttons & Interactive Links Found in DOM: ${JSON.stringify(domSnapshot.buttons)}
User Test Instructions (extract EXACT values from this): "${instructions}"

IMPORTANT: The user's instructions above may contain specific credentials, codes, or values. Extract those EXACT values for the corresponding type steps. Do NOT invent or substitute placeholder values.
Generate 4 to 6 precise execution steps.`;

          const result = await generateGeminiContentWithRetry(
            genAI,
            'gemini-2.5-pro',
            systemPrompt,
            prompt
          );

          const responseText = result.response.text();
          // Extract JSON array using regex to avoid syntax errors from preamble markdown
          const jsonArrayMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonArrayMatch) {
            plannedSteps = JSON.parse(jsonArrayMatch[0]);
          } else {
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            plannedSteps = JSON.parse(cleanJson);
          }
        } catch (e) {
          console.warn('[AI Agent] Failed to parse steps via Gemini, generating dynamic DOM-based fallback plan:', e);
        }
      }

      // Fallback if AI plan parsing produced empty list or failed
      // Parse REAL values from the user's instruction string
      if (!plannedSteps || !Array.isArray(plannedSteps) || plannedSteps.length === 0) {
        const domain = targetUrl.replace(/^https?:\/\//, '').split('/')[0];
        const firstInput = domSnapshot.inputs?.[0];
        const secondInput = domSnapshot.inputs?.[1];
        const primaryBtn = domSnapshot.buttons?.[0];

        // Extract real credential values from user instructions
        // Looks for patterns like: "code: ABC123", "password: xyz", "email test@x.com", quoted values, etc.
        const extractValue = (hint) => {
          if (!hint) return null;
          const lower = instructions.toLowerCase();
          // Look for the value after keywords near this field
          const patterns = [
            /(?:code|employee[\s_-]?code|emp[\s_-]?code|username|user|email|login|id)\s*[=:"']?\s*([\w.@+\-]+)/i,
            /(?:password|pass|pwd|secret)\s*[=:"']?\s*([\w.@+\-!#$%^&*]+)/i,
            /"([^"]+)"/g,
            /'([^']+)'/g,
          ];
          if (hint.includes('password') || hint.includes('pwd') || hint.includes('pass')) {
            const m = instructions.match(/(?:password|pass|pwd)\s*[=:"']?\s*([\w.@+\-!#$%^&*]+)/i);
            if (m) return m[1];
          }
          if (hint.includes('email') || hint.includes('user') || hint.includes('code') || hint.includes('emp')) {
            const m = instructions.match(/(?:code|employee[\s_-]?code|emp[\s_-]?code|username|user|email|login)\s*[=:"']?\s*([\w.@+\-]+)/i);
            if (m) return m[1];
          }
          // Fallback: grab the first quoted string in instructions
          const quoted = instructions.match(/["']([^"']{2,30})["']/);
          if (quoted) return quoted[1];
          return null;
        };

        const val1 = extractValue(firstInput?.type + ' ' + (firstInput?.name || firstInput?.placeholder || ''));
        const val2 = extractValue(secondInput?.type + ' ' + (secondInput?.name || secondInput?.placeholder || ''));

        plannedSteps = [
          {
            stepId: 1,
            action: 'navigate',
            description: `Navigate browser to ${targetUrl}`,
            targetElementHint: 'window.location',
            status: 'pending',
            logs: `[Browser] GET ${targetUrl} - navigating...`,
          },
          {
            stepId: 2,
            action: firstInput ? 'type' : 'hover',
            description: firstInput
              ? `Type ${firstInput.type || 'text'} into ${firstInput.selector}`
              : `Inspect navigation on ${domain}`,
            targetElementHint: firstInput?.selector || 'nav, header, body',
            value: val1 || (firstInput ? `[value from: "${instructions.slice(0, 40)}"]` : undefined),
            status: 'pending',
            logs: `[Browser] Targeting ${firstInput?.selector || 'nav'}`,
          },
          {
            stepId: 3,
            action: secondInput ? 'type' : 'click',
            description: secondInput
              ? `Type ${secondInput.type || 'text'} into ${secondInput.selector}`
              : `Click ${primaryBtn?.selector || 'submit button'}`,
            targetElementHint: secondInput?.selector || primaryBtn?.selector || 'button[type="submit"]',
            value: val2 || (secondInput ? `[value from: "${instructions.slice(0, 40)}"]` : undefined),
            status: 'pending',
            logs: `[Browser] Targeting ${secondInput?.selector || primaryBtn?.selector || 'button'}`,
          },
          {
            stepId: 4,
            action: primaryBtn ? 'click' : 'assertText',
            description: primaryBtn
              ? `Click submit button ${primaryBtn.selector}`
              : `Assert page loaded: ${domSnapshot.title || 'Target'}`,
            targetElementHint: primaryBtn?.selector || 'h1, h2',
            expectedText: primaryBtn ? undefined : domSnapshot.title,
            status: 'pending',
            logs: `[Browser] Executing action on ${primaryBtn?.selector || 'page'}`,
          },
          {
            stepId: 5,
            action: 'assertText',
            description: `Verify result matches expected outcome from instructions`,
            expectedText: domSnapshot.title || '200 OK',
            targetElementHint: 'body, h1, h2',
            status: 'pending',
            logs: `[Browser] Checking page result...`,
          },
        ];
      }

      // Capture real Playwright screenshots sequentially in a SINGLE persistent browser
      console.log('[Playwright] Executing test plan in real browser for', plannedSteps.length, 'steps...');
      const executedSteps = await executeTestPlan(targetUrl, plannedSteps);

      // Derive overall run status from step results
      const anyFailed = executedSteps.some(s => s.status === 'failed');
      runStatus = anyFailed ? 'failed' : 'passed';

      const scanId = 'run_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const runRecord = {
        scanId,
        targetUrl,
        instructions,
        moduleCategory: moduleCategory || 'General',
        organizationId: organizationId || 'default-org',
        userId: userId || 'anonymous',
        projectId: projectId || null,
        status: runStatus,
        progress: 100,
        steps: executedSteps,
        domSnapshot: domSnapshot.success ? {
          title: domSnapshot.title,
          headings: domSnapshot.headings,
          inputCount: domSnapshot.inputs?.length || 0,
          buttonCount: domSnapshot.buttons?.length || 0,
        } : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      runCache.set(scanId, runRecord);

      return res.status(200).json(runRecord);
    }

    // GET /api/agent/scans/:scanId/progress
    if (req.method === 'GET' && url.includes('/progress')) {
      const parts = url.split('/');
      const scanId = parts[parts.indexOf('scans') + 1];

      if (scanId && runCache.has(scanId)) {
        return res.status(200).json(runCache.get(scanId));
      }

      return res.status(200).json({
        scanId: scanId || 'mock_run',
        status: 'completed',
        progress: 100,
        updatedAt: new Date().toISOString(),
      });
    }

    // DELETE /api/agent/scans/:scanId or DELETE /api/agent/scans
    if (req.method === 'DELETE') {
      const cleanUrl = url.split('?')[0];
      const parts = cleanUrl.split('/');
      const scansIndex = parts.indexOf('scans');
      const scanId = scansIndex !== -1 && parts[scansIndex + 1] ? parts[scansIndex + 1] : null;

      if (scanId) {
        runCache.delete(scanId);
        return res.status(200).json({ success: true, deletedScanId: scanId });
      } else {
        runCache.clear();
        return res.status(200).json({ success: true, cleared: true });
      }
    }

    // GET /api/agent/scans
    if (req.method === 'GET') {
      const runs = Array.from(runCache.values()).reverse();
      return res.status(200).json({ runs });
    }

    return sendError(res, 404, 'Endpoint not found');
  } catch (err) {
    console.error('[AI Agent Handler Error]:', err);
    return sendError(res, 500, err.message || 'Internal server error');
  }
}

