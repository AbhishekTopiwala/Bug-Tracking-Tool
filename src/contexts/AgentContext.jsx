import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  createAgentRun,
  getAgentRuns,
  getAgentRunDetail,
  fileBugFromTestFailure,
  deleteAgentRun,
  clearAllAgentRuns,
} from '../services/agentService';

const AgentContext = createContext(null);

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used inside AgentProvider');
  return ctx;
}

export function AgentProvider({ children }) {
  const { userProfile, currentUser } = useAuth();
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const orgId = userProfile?.organizationId || 'default-org';

  // Refresh historical runs list
  const refreshRuns = useCallback(async () => {
    if (!orgId) return;
    try {
      const data = await getAgentRuns(orgId);
      setRuns(data);
    } catch (err) {
      console.error('Failed to load agent runs:', err);
    }
  }, [orgId]);

  // Delete single test run
  const deleteRun = async (scanId) => {
    try {
      await deleteAgentRun(scanId);
      setRuns(prev => prev.filter(r => (r.scanId || r.id) !== scanId));
    } catch (err) {
      console.error('Failed to delete run:', err);
      throw err;
    }
  };

  // Delete all test runs
  const deleteAllRuns = async () => {
    try {
      await clearAllAgentRuns(orgId);
      setRuns([]);
    } catch (err) {
      console.error('Failed to clear all runs:', err);
      throw err;
    }
  };

  // Initial load
  useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  // Load active run detail
  const loadRunDetail = useCallback(async (scanId) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getAgentRunDetail(scanId);
      setActiveRun(detail);
      return detail;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit a new instruction run
  const triggerRun = async ({ targetUrl, instructions, moduleCategory, projectId }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createAgentRun({
        targetUrl,
        instructions,
        moduleCategory,
        organizationId: orgId,
        userId: currentUser?.uid,
        projectId,
      });

      await refreshRuns();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Poll active run if running
  useEffect(() => {
    if (!activeRun?.scanId) return;
    if (activeRun.status === 'completed' || activeRun.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const updated = await getAgentRunDetail(activeRun.scanId);
        setActiveRun(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          refreshRuns();
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling run:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeRun?.scanId, activeRun?.status, refreshRuns]);

  const value = {
    runs,
    activeRun,
    loading,
    error,
    triggerRun,
    loadRunDetail,
    refreshRuns,
    deleteRun,
    deleteAllRuns,
    fileBugFromTestFailure,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}
