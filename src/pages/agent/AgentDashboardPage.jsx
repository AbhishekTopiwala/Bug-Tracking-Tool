import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Play, ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock, Sparkles, Zap, Trash2 } from 'lucide-react';
import { useAgent } from '../../contexts/AgentContext';
import { toast } from 'react-hot-toast';

const PRESETS = [
  {
    label: 'User Signup Validation',
    module: 'Authentication',
    url: 'https://staging-app.example.com/signup',
    instructions: 'Go to the signup page, type invalid email "test@invalid", leave password empty, click Submit, and assert that validation error messages appear for both fields.'
  },
  {
    label: 'Login Flow',
    module: 'Authentication',
    url: 'https://staging-app.example.com/login',
    instructions: 'Type email "qa.user@example.com", password "Password123!", click Login, and check if user is redirected to the dashboard page.'
  },
  {
    label: 'Checkout Coupon Validation',
    module: 'Checkout',
    url: 'https://staging-app.example.com/cart',
    instructions: 'Click Proceed to Checkout, enter discount code "DISCOUNT10", click Apply, and verify that the 10% discount is applied to the total amount.'
  },
  {
    label: 'Navigation Health Check',
    module: 'Navigation',
    url: 'https://staging-app.example.com',
    instructions: 'Click all top navbar links (Pricing, Features, Contact), and verify that no 404 error pages appear.'
  }
];

export default function AgentDashboardPage() {
  const navigate = useNavigate();
  const { runs, loading, triggerRun, refreshRuns, deleteRun, deleteAllRuns } = useAgent();

  const [targetUrl, setTargetUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [moduleCategory, setModuleCategory] = useState('Authentication');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleApplyPreset = (preset) => {
    setTargetUrl(preset.url);
    setInstructions(preset.instructions);
    setModuleCategory(preset.module);
    toast.success(`Applied preset: ${preset.label}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUrl || !instructions) {
      toast.error('Please provide both Target URL and Test Instructions');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await triggerRun({
        targetUrl,
        instructions,
        moduleCategory,
      });

      toast.success('AI Test Run Launched!');
      if (res?.scanId) {
        navigate(`/qa/agent/runs/${res.scanId}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start AI test run');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRun = async (e, scanId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this test run?')) return;
    setDeletingId(scanId);
    try {
      await deleteRun(scanId);
      toast.success('Test run deleted successfully');
    } catch (err) {
      toast.error('Failed to delete test run: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllRuns = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${runs.length} test runs? This action cannot be undone.`)) return;
    try {
      await deleteAllRuns();
      toast.success('All test runs cleared successfully');
    } catch (err) {
      toast.error('Failed to clear test runs: ' + err.message);
    }
  };

  return (
    <div className="agent-container">
      {/* Header */}
      <div className="agent-header">
        <div className="agent-title-group">
          <div className="agent-icon-badge">
            <Bot size={28} />
          </div>
          <div>
            <h1>AI Testing Bot</h1>
            <p>Execute autonomous web scenario tests using natural language instructions</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={refreshRuns} title="Refresh Runs">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Main Input Form */}
      <div className="agent-card">
        <div className="agent-card-title">
          <Sparkles size={20} style={{ color: '#4f46e5' }} />
          New Instruction-Driven Test Scenario
        </div>

        <form onSubmit={handleSubmit}>
          <div className="agent-form-grid">
            <div className="agent-form-group">
              <label className="agent-label">Target Website URL *</label>
              <input
                type="url"
                className="agent-input"
                placeholder="https://example.com/login"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
              />
            </div>

            <div className="agent-form-group">
              <label className="agent-label">Module Category</label>
              <select
                className="agent-select"
                value={moduleCategory}
                onChange={(e) => setModuleCategory(e.target.value)}
              >
                <option value="Authentication">Authentication (Login/Signup)</option>
                <option value="Forms & Inputs">Forms & Input Validation</option>
                <option value="Checkout & Payment">Checkout & Payment</option>
                <option value="Dashboard & Tables">Dashboard & Tables</option>
                <option value="Navigation">Navigation & Links</option>
                <option value="General">General E2E</option>
              </select>
            </div>

            <div className="agent-form-group full-width">
              <label className="agent-label">Test Instructions & Scenarios *</label>
              <textarea
                className="agent-textarea"
                placeholder="Describe what the AI Bot should test in plain English. Example: 'Go to signup page, fill invalid email, click Submit, and check for validation message...'"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
              />
              
              {/* Presets */}
              <div style={{ marginTop: 10 }}>
                <span className="agent-label" style={{ fontSize: '0.78rem' }}>💡 Try These Instruction Presets:</span>
                <div className="agent-preset-chips">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="agent-preset-chip"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <button type="submit" className="agent-run-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Launching AI Bot...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run AI Test Scenario
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* History Table */}
      <div className="agent-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="agent-card-title" style={{ marginBottom: 0 }}>Recent Test Runs ({runs.length})</div>
          {runs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllRuns}
              className="btn btn-secondary btn-sm"
              style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
            >
              <Trash2 size={14} /> Clear All Runs
            </button>
          )}
        </div>

        {loading && runs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Loading test runs...
          </div>
        ) : runs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            No test runs yet. Launch your first scenario above!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="runs-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Target URL</th>
                  <th>Module</th>
                  <th>Instructions</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const runId = run.scanId || run.id;
                  const isDeleting = deletingId === runId;

                  return (
                    <tr key={runId} onClick={() => navigate(`/qa/agent/runs/${runId}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className={`status-badge ${run.status || 'pending'}`}>
                          {run.status === 'completed' || run.status === 'passed' ? <CheckCircle2 size={13} /> :
                           run.status === 'failed' ? <XCircle size={13} /> :
                           <Clock size={13} />}
                          {run.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#4f46e5' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {run.targetUrl}
                          <ExternalLink size={12} />
                        </span>
                      </td>
                      <td>{run.moduleCategory || 'General'}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                        {run.instructions}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {run.createdAt ? new Date(run.createdAt.seconds ? run.createdAt.seconds * 1000 : run.createdAt).toLocaleString() : 'Just now'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                            Details &rarr;
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteRun(e, runId)}
                            disabled={isDeleting}
                            title="Delete test run"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
