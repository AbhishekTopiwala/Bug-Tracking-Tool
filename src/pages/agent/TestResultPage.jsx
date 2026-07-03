import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Image, Terminal,
  AlertTriangle, ExternalLink, Bug, ChevronDown, ChevronUp,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { useAgent } from '../../contexts/AgentContext';

export default function TestResultPage() {
  const { runId, testId } = useParams();
  const navigate = useNavigate();
  const { activeRun, loadRunDetail } = useAgent();
  const [showLogs, setShowLogs] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  useEffect(() => {
    if (!activeRun || activeRun.runId !== runId) {
      loadRunDetail(runId);
    }
  }, [runId, activeRun, loadRunDetail]);

  const test = activeRun?.tests?.find((t) => t.id === testId);

  if (!test) {
    return (
      <>
        <Topbar title="Test Result" />
        <div className="page-container">
          <button className="btn btn-ghost" onClick={() => navigate(`/qa/agent/runs/${runId}`)}>
            <ArrowLeft size={16} /> Back to Run
          </button>
          <div className="agent-empty" style={{ marginTop: 40 }}>
            <AlertTriangle size={48} />
            <h3>Test not found</h3>
            <p>This test may not have been executed yet.</p>
          </div>
        </div>
      </>
    );
  }

  const isPassed = test.status === 'passed';
  const isFailed = test.status === 'failed';

  return (
    <>
      <Topbar title={test.title || test.name} subtitle={`${test.category || 'General'} test`} />
      <div className="page-container">

        {/* Back */}
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(`/qa/agent/runs/${runId}`)}>
          <ArrowLeft size={16} /> Back to Run
        </button>

        {/* ── Status Header ───────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className={`agent-test-icon ${test.status}`} style={{ width: 48, height: 48 }}>
              {isPassed ? <CheckCircle2 size={24} /> : isFailed ? <XCircle size={24} /> : <Clock size={24} />}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{test.title || test.name}</h3>
              {test.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {test.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`agent-badge agent-badge-${isPassed ? 'completed' : isFailed ? 'failed' : test.status === 'draft' ? 'queued' : 'queued'}`}>
                  {test.status}
                </span>
                {test.duration && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {(test.duration / 1000).toFixed(1)}s
                  </span>
                )}
                <span className="tag">{test.category || 'general'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Generated Files / Steps ─────────────────────────────────────────────────── */}
          <div>
            <div className="agent-section-header">
              <h4 className="agent-section-title">{test.files ? 'Generated Test Files' : 'Test Steps'}</h4>
            </div>

            {test.files && test.files.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {test.files.map((file, i) => (
                  <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                      padding: '10px 16px', background: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border)', fontSize: '0.85rem',
                      fontWeight: 600, color: 'var(--text-primary)'
                    }}>
                      {file.filename}
                    </div>
                    <div style={{ padding: 16, background: '#0F172A', overflowX: 'auto' }}>
                      <pre style={{
                        margin: 0, fontSize: '0.8rem', color: '#E2E8F0',
                        fontFamily: 'monospace', lineHeight: 1.5
                      }}>
                        {file.content}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                {(test.steps || []).map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '14px 20px',
                      borderBottom: i < test.steps.length - 1 ? '1px solid var(--border-light)' : 'none',
                      background: step.status === 'failed' ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                      background: step.status === 'passed' ? 'rgba(16, 185, 129, 0.1)' :
                        step.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)',
                      color: step.status === 'passed' ? 'var(--success)' :
                        step.status === 'failed' ? 'var(--danger)' : 'var(--text-muted)',
                      fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {step.status === 'passed' ? <CheckCircle2 size={14} /> :
                        step.status === 'failed' ? <XCircle size={14} /> : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        <code style={{
                          background: 'var(--bg-primary)', padding: '1px 6px',
                          borderRadius: 4, fontSize: '0.75rem', marginRight: 6,
                          color: 'var(--accent)',
                        }}>
                          {step.action}
                        </code>
                        {step.target || step.selector || ''}
                      </p>
                      {step.value && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Value: "{step.value}"
                        </p>
                      )}
                      {step.error && (
                        <p style={{
                          fontSize: '0.78rem', color: 'var(--danger)', marginTop: 4,
                          padding: '6px 10px', background: 'rgba(239, 68, 68, 0.06)',
                          borderRadius: 'var(--radius-sm)', fontFamily: 'monospace',
                        }}>
                          {step.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {(!test.steps || test.steps.length === 0) && (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No steps recorded
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Column: Screenshots + Analysis ──────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Screenshots */}
            {test.screenshotUrls && Object.keys(test.screenshotUrls).length > 0 && (
              <div>
                <div className="agent-section-header">
                  <h4 className="agent-section-title">
                    <Image size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Screenshots
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {Object.entries(test.screenshotUrls).map(([key, url]) => (
                    <div
                      key={key}
                      className="card"
                      style={{ padding: 0, cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => setSelectedScreenshot({ key, url })}
                    >
                      <img
                        src={url}
                        alt={key}
                        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
                      />
                      <div style={{ padding: '8px 12px' }}>
                        <p style={{
                          fontSize: '0.72rem', fontWeight: 600,
                          color: 'var(--text-muted)', textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {key}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {test.aiAnalysis && (
              <div>
                <div className="agent-section-header">
                  <h4 className="agent-section-title">
                    <Bug size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    AI Analysis
                  </h4>
                </div>
                <div className="ai-panel" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 12 }}>
                    <p style={{
                      fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                    }}>
                      Root Cause
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {test.aiAnalysis.rootCause}
                    </p>
                  </div>
                  {test.aiAnalysis.severity && (
                    <div style={{ marginBottom: 12 }}>
                      <span className={`badge badge-${test.aiAnalysis.severity.toLowerCase()}`}>
                        {test.aiAnalysis.severity}
                      </span>
                    </div>
                  )}
                  {test.aiAnalysis.recommendation && (
                    <div style={{
                      padding: '10px 14px', background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    }}>
                      <p style={{
                        fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
                      }}>
                        Recommendation
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {test.aiAnalysis.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Console Logs */}
            {test.consoleLogs?.length > 0 && (
              <div>
                <button
                  className="btn btn-ghost"
                  style={{ gap: 6, fontSize: '0.78rem', fontWeight: 700, padding: '6px 0' }}
                  onClick={() => setShowLogs(!showLogs)}
                >
                  <Terminal size={14} />
                  Console Logs ({test.consoleLogs.length})
                  {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showLogs && (
                  <div style={{
                    marginTop: 8, padding: '14px 16px',
                    background: '#0F172A', borderRadius: 'var(--radius-sm)',
                    maxHeight: 300, overflowY: 'auto',
                  }}>
                    {test.consoleLogs.map((log, i) => (
                      <p key={i} style={{
                        fontSize: '0.75rem', color: '#94A3B8',
                        fontFamily: 'monospace', lineHeight: 1.8,
                      }}>
                        {log}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Screenshot Modal ──────────────────────────────────────── */}
        {selectedScreenshot && (
          <div className="modal-overlay" onClick={() => setSelectedScreenshot(null)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ padding: 0 }}>
              <div className="modal-header">
                <h4>Screenshot: {selectedScreenshot.key}</h4>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedScreenshot(null)}>
                  <XCircle size={18} />
                </button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                <img
                  src={selectedScreenshot.url}
                  alt={selectedScreenshot.key}
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
