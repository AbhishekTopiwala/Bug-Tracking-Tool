import { auth } from '../firebase/config';
import { getCurrentOrgId } from './firestoreService';

// ── Helper ────────────────────────────────────────────────────────────────────

async function agentFetch(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchOpts = { method, headers };
  if (options.body) {
    fetchOpts.body = JSON.stringify(options.body);
  }

  const res = await fetch(endpoint, fetchOpts);
  let data;
  try {
    data = await res.json();
  } catch (err) {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}: Backend might be down or unreachable.`);
    }
    throw new Error('Invalid JSON response from server');
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// ── Agent API calls ───────────────────────────────────────────────────────────

/**
 * Start a new agent crawl run.
 * @param {string} url - Target website URL
 * @param {object} config - Optional crawl config (maxPages, depth, etc.)
 * @param {string} projectId - Optional Qualia project to link
 * @returns {{ scanId: string, status: string }}
 */
export async function startAgentRun(url, config = {}, projectId = null) {
  const orgId = getCurrentOrgId();
  // Call the new scans API to create a scan.
  // We use orgId as appId for now.
  return agentFetch('/api/agent/scans', {
    method: 'POST',
    body: { appId: orgId, baseUrl: url, environment: 'staging', config },
  });
}

/**
 * Get the current status of a run.
 * @param {string} scanId
 * @returns {object} Run status with progress, current step, etc.
 */
export async function getRunStatus(scanId) {
  return agentFetch(`/api/agent/scans/${scanId}/progress`);
}

/**
 * List all agent runs for the current org.
 * @param {number} limit - Max runs to return (default 20)
 * @returns {object[]} Array of run summaries
 */
export async function listAgentRuns(limit = 20) {
  const orgId = getCurrentOrgId();
  const data = await agentFetch(`/api/agent/scans?appId=${orgId}&limit=${limit}`);
  // Map scans back to runs for the UI Context
  return { runs: data.scans || [] };
}

/**
 * Get full detail for a single run.
 * @param {string} scanId
 * @returns {object} Full run data with tests
 */
export async function getRunDetail(scanId) {
  const scan = await agentFetch(`/api/agent/scans/${scanId}/progress`);
  const testsData = await agentFetch(`/api/agent/scans/${scanId}/tests`);
  scan.tests = testsData.tests || [];
  return scan;
}

/**
 * Trigger test generation for a crawled run.
 * @param {string} scanId
 * @returns {{ testsGenerated: number, tests: object[] }}
 */
export async function generateTests(scanId) {
  const appId = getCurrentOrgId();
  return agentFetch('/api/agent/generate-tests', {
    method: 'POST',
    body: { scanId, appId },
  });
}

/**
 * Trigger test execution via Cloud Run worker.
 * @param {string} scanId
 * @param {string[]} testIds - Optional subset of tests to execute
 * @returns {{ status: string }}
 */
export async function executeTests(scanId, testIds = null) {
  const appId = getCurrentOrgId();
  return agentFetch('/api/agent/execute', {
    method: 'POST',
    body: { scanId, appId, testIds },
  });
}

/**
 * Trigger AI failure analysis + bug report generation.
 * @param {string} scanId
 * @returns {{ bugsGenerated: number, bugIds: string[] }}
 */
export async function analyzeFailures(scanId) {
  const appId = getCurrentOrgId();
  return agentFetch('/api/agent/analyze', {
    method: 'POST',
    body: { scanId, appId },
  });
}
