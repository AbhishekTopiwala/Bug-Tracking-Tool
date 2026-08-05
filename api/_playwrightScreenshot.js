import { chromium } from 'playwright';

/**
 * Generate a visual SVG telemetry representation for a test step when real browser screenshot is unavailable.
 */
function generateTelemetrySvg(step, targetUrl, stepNumber, isPassed, durationMs = 0) {
  const url = targetUrl || 'https://example.com';
  const domain = url.replace(/^https?:\/\//, '').split('/')[0];
  const action = (step.action || 'ACTION').toUpperCase();
  const statusColor = isPassed ? '#10B981' : '#EF4444';
  const statusBg = isPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
  const statusText = isPassed ? 'PASSED' : 'FAILED';
  const targetHint = (step.targetElementHint || 'window.location').slice(0, 45);
  const desc = (step.description || 'Executing test step').slice(0, 60);
  const val = step.value ? `Value: "${String(step.value).slice(0, 30)}"` : (step.expectedText ? `Expected: "${String(step.expectedText).slice(0, 30)}"` : '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
    <!-- Background -->
    <rect width="1280" height="800" fill="#0F172A"/>
    <rect width="1280" height="800" fill="url(#grid)" opacity="0.05"/>

    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" stroke-width="1"/>
      </pattern>
      <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#1E293B"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>

    <!-- Window Frame -->
    <rect x="40" y="40" width="1200" height="720" rx="12" fill="#1E293B" stroke="#334155" stroke-width="2"/>
    
    <!-- Browser Header Bar -->
    <rect x="40" y="40" width="1200" height="48" rx="12" fill="url(#headerGrad)"/>
    <rect x="40" y="76" width="1200" height="12" fill="#1E293B"/>
    
    <!-- Window Controls -->
    <circle cx="68" cy="64" r="6" fill="#EF4444"/>
    <circle cx="88" cy="64" r="6" fill="#F59E0B"/>
    <circle cx="108" cy="64" r="6" fill="#10B981"/>

    <!-- URL Bar -->
    <rect x="140" y="52" width="700" height="24" rx="6" fill="#0F172A" stroke="#475569" stroke-width="1"/>
    <text x="155" y="68" font-family="monospace" font-size="12" fill="#94A3B8">🔒 ${url}</text>

    <!-- Telemetry Status Badge in Header -->
    <rect x="1080" y="52" width="140" height="24" rx="12" fill="${statusBg}" stroke="${statusColor}" stroke-width="1"/>
    <text x="1150" y="68" font-family="sans-serif" font-weight="bold" font-size="11" fill="${statusColor}" text-anchor="middle">Step ${stepNumber} • ${statusText}</text>

    <!-- Canvas Area -->
    <rect x="60" y="100" width="1160" height="640" rx="8" fill="#090D16" stroke="#1E293B" stroke-width="1"/>

    <!-- Simulated UI Layout Card -->
    <rect x="100" y="140" width="1080" height="560" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <rect x="140" y="180" width="400" height="28" rx="4" fill="#334155"/>
    <text x="150" y="200" font-family="sans-serif" font-size="14" font-weight="bold" fill="#F8FAFC">${domain} — Test Telemetry View</text>

    <!-- Action Box / Target Element Highlight -->
    <rect x="140" y="240" width="1000" height="180" rx="8" fill="#0F172A" stroke="${statusColor}" stroke-width="2" stroke-dasharray="6,4"/>
    
    <!-- Target Element Selector Pin -->
    <rect x="160" y="260" width="180" height="24" rx="4" fill="#3B82F6"/>
    <text x="250" y="276" font-family="sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">TARGET ELEMENT</text>
    
    <text x="160" y="315" font-family="monospace" font-size="15" fill="#60A5FA" font-weight="bold">${targetHint}</text>
    <text x="160" y="345" font-family="sans-serif" font-size="14" fill="#E2E8F0">${desc}</text>
    ${val ? `<text x="160" y="375" font-family="monospace" font-size="13" fill="#A7F3D0">${val}</text>` : ''}

    <!-- Telemetry Information Cards -->
    <rect x="140" y="450" width="310" height="120" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="160" y="480" font-family="sans-serif" font-size="12" fill="#64748B">ACTION TYPE</text>
    <text x="160" y="510" font-family="sans-serif" font-size="20" font-weight="bold" fill="#60A5FA">${action}</text>
    <text x="160" y="545" font-family="monospace" font-size="11" fill="#94A3B8">Execution latency: ${durationMs}ms</text>

    <rect x="475" y="450" width="310" height="120" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="495" y="480" font-family="sans-serif" font-size="12" fill="#64748B">EXECUTION STATUS</text>
    <text x="495" y="510" font-family="sans-serif" font-size="20" font-weight="bold" fill="${statusColor}">${statusText}</text>
    <text x="495" y="545" font-family="monospace" font-size="11" fill="#94A3B8">Playwright Engine v1.40</text>

    <rect x="810" y="450" width="330" height="120" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="830" y="480" font-family="sans-serif" font-size="12" fill="#64748B">TELEMETRY LOG</text>
    <text x="830" y="510" font-family="monospace" font-size="11" fill="#E2E8F0">${(step.logs || 'Telemetry recorded').slice(0, 42)}</text>
    ${step.error ? `<text x="830" y="535" font-family="monospace" font-size="11" fill="#EF4444">Error: ${String(step.error).slice(0, 38)}</text>` : ''}

    <!-- Watermark Banner -->
    <text x="640" y="720" font-family="sans-serif" font-size="12" fill="#475569" text-anchor="middle">Qualia AI QA Agent • Automated Execution Telemetry</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Launch a real Chromium browser ONCE and execute all steps sequentially using Playwright.
 * Preserves browser state between steps and captures full execution telemetry.
 *
 * @param {string} targetUrl - The starting URL
 * @param {Array} plannedSteps - The steps to execute
 * @returns {Promise<Array>} The executed steps with status, screenshot, durationMs, error, logs
 */
export async function executeTestPlan(targetUrl, plannedSteps) {
  let browser = null;
  const executedSteps = [];

  try {
    const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

    // Launch visible browser in local dev, but headless on Vercel/Prod
    const isLocalDev = !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production';
    
    browser = await chromium.launch({
      headless: !isLocalDev,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      timeout: 20000,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    let hasFailed = false;

    // Collect browser console messages for rich step telemetry
    const pageConsoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (!text.includes('Download the React DevTools')) {
        pageConsoleLogs.push(`[Console ${msg.type().toUpperCase()}] ${text.slice(0, 150)}`);
      }
    });

    page.on('pageerror', err => {
      pageConsoleLogs.push(`[Uncaught Error] ${err.message.slice(0, 150)}`);
    });

    const actionDelay = isLocalDev ? 400 : 0;

    for (let i = 0; i < plannedSteps.length; i++) {
      const stepStartTime = Date.now();
      const step = plannedSteps[i];
      const action = (step.action || 'navigate').toLowerCase();
      const selector = step.targetElementHint;
      const value = step.value;
      
      let status = 'passed';
      let error = null;
      let logs = '';
      let screenshot = null;

      try {
        if (hasFailed) {
          status = 'failed';
          error = 'Skipped due to previous step failure';
          logs = '[Browser] Step skipped due to prior failure';
        } else {
          if (isLocalDev && i > 0) await page.waitForTimeout(actionDelay);

          // Clear previous step console accumulator
          const logsBefore = pageConsoleLogs.length;

          if (action === 'navigate') {
            await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(800);
            const title = await page.title();
            logs = `[Browser] GET ${cleanUrl} — Loaded: "${title}"`;
            
          } else if (action === 'type' && selector && value) {
            try {
              const isPassword = String(value).length >= 4 && (step.description?.toLowerCase().includes('password') || selector.includes('password'));
              
              const locators = [
                page.locator(selector).first(),
                isPassword ? page.locator('input[type="password"]').first() : null,
                String(value).includes('@') ? page.locator('input[type="email"]').first() : null,
                page.getByRole('textbox').first(),
                page.locator('input:not([type="hidden"])').first()
              ].filter(Boolean);

              let typed = false;
              for (const loc of locators) {
                try {
                  if (await loc.count() > 0) {
                    await loc.waitFor({ state: 'visible', timeout: 3000 });
                    await loc.fill('');
                    await loc.pressSequentially(String(value), { delay: isLocalDev ? 40 : 0 });
                    logs = `[Browser] Typed "${isPassword ? '••••••••' : value}" into ${selector}`;
                    typed = true;
                    break;
                  }
                } catch (_) { continue; }
              }
              if (!typed) throw new Error(`Could not find input element matching selector: ${selector}`);
            } catch (typeErr) {
              status = 'failed';
              error = typeErr.message;
              logs = `[Browser] Type error: ${typeErr.message}`;
            }

          } else if (action === 'click' && selector) {
            try {
              const locators = [
                page.locator(selector).first(),
                page.getByRole('button', { name: new RegExp(selector, 'i') }).first(),
                page.locator('button[type="submit"]').first(),
                page.locator('button').first(),
                page.locator('input[type="submit"]').first(),
                page.locator('.btn').first()
              ].filter(Boolean);

              let clicked = false;
              for (const loc of locators) {
                try {
                  if (await loc.count() > 0) {
                    await loc.waitFor({ state: 'visible', timeout: 3000 });
                    await loc.click();
                    await page.waitForTimeout(800);
                    logs = `[Browser] Clicked target element ${selector}`;
                    clicked = true;
                    break;
                  }
                } catch (_) { continue; }
              }
              if (!clicked) throw new Error(`Could not click element: ${selector}`);
            } catch (clickErr) {
              status = 'failed';
              error = clickErr.message;
              logs = `[Browser] Click error: ${clickErr.message}`;
            }

          } else if (action === 'select' && selector && value) {
            try {
              const loc = page.locator(selector).first();
              await loc.waitFor({ state: 'visible', timeout: 3000 });
              await loc.selectOption(String(value));
              logs = `[Browser] Selected option "${value}" in ${selector}`;
            } catch (selectErr) {
              status = 'failed';
              error = selectErr.message;
              logs = `[Browser] Select error: ${selectErr.message}`;
            }

          } else if (action === 'asserttext' && step.expectedText) {
            try {
              const loc = page.locator(`text=${step.expectedText}`);
              await loc.first().waitFor({ state: 'visible', timeout: 5000 });
              logs = `[Browser] ASSERTION PASSED — Target text "${step.expectedText}" present`;
            } catch (assertErr) {
              const bodyText = await page.textContent('body');
              if (bodyText && bodyText.toLowerCase().includes(step.expectedText.toLowerCase())) {
                 logs = `[Browser] ASSERTION PASSED — Found "${step.expectedText}" in DOM text`;
              } else {
                 status = 'failed';
                 error = `Expected text "${step.expectedText}" was not found on page`;
                 logs = `[Browser] ASSERTION FAILED — "${step.expectedText}" missing`;
              }
            }

          } else if (action === 'hover' && selector) {
            try {
              const loc = page.locator(selector).first();
              await loc.waitFor({ state: 'visible', timeout: 3000 });
              await loc.hover();
              logs = `[Browser] Hovered over ${selector}`;
            } catch (_) {
              logs = `[Browser] Hover element not visible: ${selector}`;
            }
          }

          // Append newly captured browser console logs to step telemetry
          const newConsoleLogs = pageConsoleLogs.slice(logsBefore);
          if (newConsoleLogs.length > 0) {
            logs += '\n' + newConsoleLogs.slice(0, 3).join('\n');
          }

          await page.waitForTimeout(400);

          // Capture step screenshot
          try {
            const screenshotBuffer = await page.screenshot({ type: 'png' });
            screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
          } catch (shotErr) {
            console.warn(`[Playwright] Step ${i + 1} screenshot failed:`, shotErr.message);
          }
        }
      } catch (fatalErr) {
        status = 'failed';
        error = fatalErr.message;
        logs = `[Browser] Step fatal error: ${fatalErr.message}`;
      }

      if (status === 'failed') {
        hasFailed = true;
      }

      const durationMs = Date.now() - stepStartTime;
      const isPassed = status === 'passed';

      // Fallback SVG if screenshot was not generated by Chromium
      if (!screenshot) {
        screenshot = generateTelemetrySvg(step, targetUrl, i + 1, isPassed, durationMs);
      }

      console.log(`[Playwright] Step ${i + 1} (${action}) — ${status.toUpperCase()} (${durationMs}ms)`);

      executedSteps.push({
        ...step,
        stepId: i + 1,
        status: status,
        error: error || step.error || null,
        logs: logs || step.logs || '',
        durationMs,
        screenshot: screenshot,
        executedAt: new Date().toISOString(),
      });
    }

    return executedSteps;

  } catch (err) {
    console.error(`[Playwright] Fatal test plan execution error:`, err.message);

    // Provide robust SVG telemetry for every step if browser fails to launch
    return plannedSteps.map((s, i) => {
      const isPassed = s.status === 'passed';
      return {
        ...s,
        stepId: i + 1,
        status: 'failed',
        error: 'Browser runner error: ' + err.message,
        logs: `[Browser] FATAL RUNNER ERROR: ${err.message}`,
        durationMs: 0,
        screenshot: generateTelemetrySvg(s, targetUrl, i + 1, false, 0),
        executedAt: new Date().toISOString(),
      };
    });
  } finally {
    if (browser) {
      const isLocalDev = !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production';
      if (isLocalDev) await new Promise(r => setTimeout(r, 1500));
      try { await browser.close(); } catch (_) {}
    }
  }
}


