import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Clock, CheckCircle2, XCircle, Loader2,
  Play, BarChart3, Bug, Image, Terminal, ChevronRight,
  Scan, TestTube2, Zap, AlertCircle, RefreshCw,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { useAgent } from '../../contexts/AgentContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PIPELINE_STEPS = [
  { key: 'crawling',           label: 'Crawl',    icon: Scan },
  { key: 'analyzing',          label: 'Analyze',  icon: Zap },
  { key: 'generating',         label: 'Generate', icon: TestTube2 },
  { key: 'executing',          label: 'Execute',  icon: Play },
  { key: 'analyzing_failures', label: 'Report',   icon: Bug },
];

const STATUS_ORDER = ['crawling', 'analyzing', 'generating', 'executing', 'analyzing_failures', 'completed'];

function getStepState(stepKey, runStatus) {
  if (runStatus === 'completed' || runStatus === 'failed') {
    const failedIdx = STATUS_ORDER.indexOf(runStatus === 'failed' ? runStatus : 'completed');
    const stepIdx = STATUS_ORDER.indexOf(stepKey);
    // If failed, mark steps up to the failed step
    if (runStatus === 'failed') {
      return stepIdx < STATUS_ORDER.indexOf(runStatus) ? 'completed' : 'pending';
    }
    return 'completed';
  }
  const currentIdx = STATUS_ORDER.indexOf(runStatus);
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function PipelineTracker({ status }) {
  return (
    <div className="agent-pipeline">
      {PIPELINE_STEPS.map((step, i) => {
        const state = getStepState(step.key, status);
        const Icon = step.icon;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`agent-pipeline-step ${state}`}>
              {state === 'completed' ? (
                <CheckCircle2 size={14} />
              ) : state === 'active' ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Icon size={14} />
              )}
              {step.label}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`agent-pipeline-connector ${state === 'completed' ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TestCard({ test, onClick }) {
  const statusIcon = {
    passed:  <CheckCircle2 size={18} />,
    failed:  <XCircle size={18} />,
    running: <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />,
    pending: <Clock size={18} />,
  };

  const statusClass = test.status || 'pending';

  return (
    <div className="agent-test-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className={`agent-test-icon ${statusClass}`}>
        {statusIcon[statusClass] || statusIcon.pending}
      </div>
      <div className="agent-test-info">
        <p className="agent-test-name">{test.title || test.name}</p>
        <p className="agent-test-category">{test.category || 'general'}</p>
      </div>
      {test.duration && (
        <span className="agent-test-duration">{(test.duration / 1000).toFixed(1)}s</span>
      )}
      {onClick && <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
    </div>
  );
}

export default function RunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { activeRun, loading, loadRunDetail, triggerGenerateTests, triggerExecuteTests, triggerAnalyzeFailures } = useAgent();
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (runId) loadRunDetail(runId);
  }, [runId, loadRunDetail]);

  const run = activeRun;

  const handleAction = async (action, fn) => {
    setActionLoading(action);
    try {
      await fn(runId);
      toast.success(`${action} triggered successfully`);
    } catch (err) {
      toast.error(err.message || `${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !run) {
    return (
      <>
        <Topbar title="Run Detail" />
        <div className="page-container">
          <div className="agent-empty">
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', opacity: 0.5 }} />
            <p>Loading run details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!run) {
    return (
      <>
        <Topbar title="Run Detail" />
        <div className="page-container">
          <div className="agent-empty">
            <AlertCircle size={48} />
            <h3>Run not found</h3>
            <p>This run may have been deleted or you don't have access.</p>
            <button className="btn btn-secondary" onClick={() => navigate('/qa/agent')}>
              <ArrowLeft size={16} /> Back to Agent
            </button>
          </div>
        </div>
      </>
    );
  }

  const displayUrl = (() => {
    try {
      return new URL(run.baseUrl || run.targetUrl).hostname;
    } catch {
      return run.baseUrl || run.targetUrl;
    }
  })();

  const timeAgo = run.createdAt
    ? formatDistanceToNow(new Date(run.createdAt?.seconds ? run.createdAt.seconds * 1000 : run.createdAt), { addSuffix: true })
    : '';

  const tests = run.tests || [];
  const passedTests = tests.filter((t) => t.status === 'passed');
  const failedTests = tests.filter((t) => t.status === 'failed');

  return (
    <>
      <Topbar title={`Testing ${displayUrl}`} subtitle={`Run started ${timeAgo}`} />
      <div className="page-container">

        {/* Back button */}
        <button
          className="btn btn-ghost"
          style={{ marginBottom: 16 }}
          onClick={() => navigate('/qa/agent')}
        >
          <ArrowLeft size={16} /> Back to Agent
        </button>

        {/* ── Header Card ─────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Globe size={18} style={{ color: 'var(--accent)' }} />
                <a
                  href={run.baseUrl || run.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}
                >
                  {run.baseUrl || run.targetUrl}
                </a>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`agent-badge agent-badge-${run.status === 'completed' ? 'completed' : run.status === 'failed' ? 'failed' : 'crawling'}`}>
                  <span className={`agent-badge-dot ${['crawling', 'analyzing', 'generating', 'executing', 'analyzing_failures'].includes(run.status) ? 'pulsing' : ''}`} />
                  {run.status}
                </span>
                {run.crawlResult?.pagesFound > 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {run.crawlResult.pagesFound} pages found
                  </span>
                )}
                {timeAgo && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {timeAgo}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {run.status === 'crawled' && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={actionLoading === 'Generate'}
                  onClick={() => handleAction('Generate', triggerGenerateTests)}
                >
                  {actionLoading === 'Generate' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <TestTube2 size={14} />}
                  Generate Tests
                </button>
              )}
              {run.status === 'ready_to_execute' && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={actionLoading === 'Execute'}
                  onClick={() => handleAction('Execute', triggerExecuteTests)}
                >
                  {actionLoading === 'Execute' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                  Execute Tests
                </button>
              )}
              {run.status === 'executed' && failedTests.length > 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={actionLoading === 'Analyze'}
                  onClick={() => handleAction('Analyze', triggerAnalyzeFailures)}
                >
                  {actionLoading === 'Analyze' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <BarChart3 size={14} />}
                  Analyze Failures
                </button>
              )}
            </div>
          </div>

          {/* Pipeline Tracker */}
          <PipelineTracker status={run.status} />

          {/* Progress bar */}
          {(run.progressPercent > 0 || run.progress > 0) && run.status !== 'completed' && run.status !== 'failed' && (
            <div className="agent-progress">
              <div className="agent-progress-bar">
                <div className="agent-progress-fill" style={{ width: `${run.progressPercent || run.progress}%` }} />
              </div>
              <div className="agent-progress-label">
                <span>{run.currentStep || run.status}</span>
                <span>{run.progressPercent || run.progress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        {run.status === 'completed' && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                <Scan size={22} />
              </div>
              <div className="stat-info">
                <p className="stat-value">{run.metrics?.pagesCrawled || run.crawlResult?.pagesCrawled || 0}</p>
                <p className="stat-label">Pages Crawled</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                <TestTube2 size={22} />
              </div>
              <div className="stat-info">
                <p className="stat-value">{run.metrics?.testsGenerated || run.testsGenerated || 0}</p>
                <p className="stat-label">Tests Run</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                <CheckCircle2 size={22} />
              </div>
              <div className="stat-info">
                <p className="stat-value">{run.metrics?.testsPassed || run.testsPassed || 0}</p>
                <p className="stat-label">Passed</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <Bug size={22} />
              </div>
              <div className="stat-info">
                <p className="stat-value">{run.metrics?.bugsFound || run.bugsGenerated || 0}</p>
                <p className="stat-label">Bugs Found</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Test Results ────────────────────────────────────────────── */}
        {tests.length > 0 && (
          <div>
            <div className="agent-section-header">
              <h4 className="agent-section-title">Test Results</h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {passedTests.length} passed · {failedTests.length} failed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Failed tests first */}
              {failedTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  onClick={() => navigate(`/qa/agent/runs/${runId}/tests/${test.id}`)}
                />
              ))}
              {/* Then passed */}
              {passedTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  onClick={() => navigate(`/qa/agent/runs/${runId}/tests/${test.id}`)}
                />
              ))}
              {/* Then everything else */}
              {tests
                .filter((t) => t.status !== 'passed' && t.status !== 'failed')
                .map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
            </div>
          </div>
        )}

        {/* ── Crawl Results (pages found) ─────────────────────────────── */}
        {run.crawlResult?.pages?.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="agent-section-header">
              <h4 className="agent-section-title">Discovered Pages</h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {run.crawlResult.pages.length} pages
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {run.crawlResult.pages.map((page, i) => (
                <div key={i} className="card" style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>
                        {page.title || page.url}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{page.url}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {page.forms?.length > 0 && (
                        <span className="tag">{page.forms.length} form{page.forms.length > 1 ? 's' : ''}</span>
                      )}
                      {page.buttons?.length > 0 && (
                        <span className="tag">{page.buttons.length} button{page.buttons.length > 1 ? 's' : ''}</span>
                      )}
                      {page.pageType && (
                        <span className="badge badge-open">{page.pageType}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state for in-progress runs ────────────────────────── */}
        {tests.length === 0 && !run.crawlResult?.pages?.length && run.status !== 'failed' && (
          <div className="agent-empty" style={{ marginTop: 32 }}>
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
            <h3>Agent is working...</h3>
            <p>The AI agent is {run.status || 'processing'}. This page will update automatically as results come in.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
