import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  startAgentRun,
  getRunStatus,
  listAgentRuns,
  getRunDetail,
  generateTests,
  executeTests,
  analyzeFailures,
} from '../services/agentService';

const AgentContext = createContext(null);

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used inside AgentProvider');
  return ctx;
}

const POLL_INTERVAL = 5000; // 5 seconds

const ACTIVE_STATUSES = [
  'queued',
  'crawling',
  'analyzing',
  'generating',
  'executing',
  'analyzing_failures',
];

export function AgentProvider({ children }) {
  const { currentUser } = useAuth();

  // ── State ───────────────────────────────────────────────────────────────────
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // ── Polling ─────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (runId) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const status = await getRunStatus(runId);
          setActiveRun((prev) => (prev ? { ...prev, ...status } : status));

          // Update the run in the list as well
          setRuns((prev) =>
            prev.map((r) => (r.scanId === runId || r.runId === runId ? { ...r, ...status } : r))
          );

          // Stop polling if run is no longer active
          if (!ACTIVE_STATUSES.includes(status.status)) {
            stopPolling();
          }
        } catch (err) {
          console.error('[AgentContext] Poll error:', err);
        }
      }, POLL_INTERVAL);
    },
    [stopPolling]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const refreshRuns = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await listAgentRuns(20);
      setRuns(data.runs || []);
    } catch (err) {
      console.error('[AgentContext] Failed to load runs:', err);
    }
  }, [currentUser]);

  const createRun = useCallback(
    async (url, config = {}, projectId = null) => {
      setLoading(true);
      setError(null);
      try {
        const result = await startAgentRun(url, config, projectId);
        const newRun = {
          scanId: result.scanId,
          runId: result.scanId, // Fallback for components that still expect runId
          baseUrl: url,
          status: result.status || 'created',
          progressPercent: 0,
          createdAt: new Date().toISOString(),
        };
        setActiveRun(newRun);
        setRuns((prev) => [newRun, ...prev]);
        
        // After creating the scan, we actually want to start it!
        // The scans API requires a separate `/start` call to actually begin.
        // For now, if the crawler isn't triggered automatically, we could trigger it.
        // Wait, startAgentRun POSTs to /api/agent/scans, which returns status: 'created'.
        
        startPolling(result.scanId);
        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [startPolling]
  );

  const loadRunDetail = useCallback(async (runId) => {
    setLoading(true);
    try {
      const detail = await getRunDetail(runId);
      setActiveRun(detail);

      // Start polling if the run is still active
      if (ACTIVE_STATUSES.includes(detail.status)) {
        startPolling(runId);
      }

      return detail;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [startPolling]);

  const triggerGenerateTests = useCallback(async (runId) => {
    return generateTests(runId);
  }, []);

  const triggerExecuteTests = useCallback(
    async (runId, testIds = null) => {
      const result = await executeTests(runId, testIds);
      startPolling(runId);
      return result;
    },
    [startPolling]
  );

  const triggerAnalyzeFailures = useCallback(async (runId) => {
    return analyzeFailures(runId);
  }, []);

  const clearActiveRun = useCallback(() => {
    stopPolling();
    setActiveRun(null);
  }, [stopPolling]);

  // ── Context value ───────────────────────────────────────────────────────────

  const value = {
    // State
    runs,
    activeRun,
    loading,
    error,

    // Actions
    createRun,
    refreshRuns,
    loadRunDetail,
    clearActiveRun,
    triggerGenerateTests,
    triggerExecuteTests,
    triggerAnalyzeFailures,
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}
