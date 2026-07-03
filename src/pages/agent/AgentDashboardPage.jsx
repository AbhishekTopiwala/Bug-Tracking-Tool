import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Globe, Play, Search as SearchIcon, Loader2,
  CheckCircle2, XCircle, Clock, ArrowRight,
  Scan, TestTube2, Bug, BarChart3, Zap,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { useAgent } from '../../contexts/AgentContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  created:             { label: 'Created',    cls: 'queued',    pulsing: false },
  queued:              { label: 'Queued',     cls: 'queued',    pulsing: false },
  running:             { label: 'Running',    cls: 'crawling',  pulsing: true },
  crawling:            { label: 'Crawling',   cls: 'crawling',  pulsing: true },
  analyzing:           { label: 'Analyzing',  cls: 'analyzing', pulsing: true },
  generating:          { label: 'Generating', cls: 'generating', pulsing: true },
  executing:           { label: 'Executing',  cls: 'executing', pulsing: true },
  analyzing_failures:  { label: 'Analyzing',  cls: 'analyzing', pulsing: true },
  completed:           { label: 'Completed',  cls: 'completed', pulsing: false },
  failed:              { label: 'Failed',     cls: 'failed',    pulsing: false },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  return (
    <span className={`agent-badge agent-badge-${cfg.cls}`}>
      <span className={`agent-badge-dot ${cfg.pulsing ? 'pulsing' : ''}`} />
      {cfg.label}
    </span>
  );
}

function RunCard({ run, onClick }) {
  const timeAgo = run.createdAt
    ? formatDistanceToNow(new Date(run.createdAt?.seconds ? run.createdAt.seconds * 1000 : run.createdAt), { addSuffix: true })
    : 'Just now';

  const displayUrl = (() => {
    try {
      const u = new URL(run.baseUrl || run.targetUrl);
      return u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return run.baseUrl || run.targetUrl;
    }
  })();

  return (
    <div className="agent-run-card" data-status={run.status} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="agent-run-url" title={run.baseUrl}>
            <Globe size={13} style={{ marginRight: 6, verticalAlign: -1, color: 'var(--accent)' }} />
            {displayUrl}
          </p>
          <p className="agent-run-time">{timeAgo}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {/* Progress bar for active runs */}
      {['created', 'running', 'crawling', 'analyzing', 'generating', 'executing', 'analyzing_failures'].includes(run.status) && (
        <div className="agent-progress">
          <div className="agent-progress-bar">
            <div className="agent-progress-fill" style={{ width: `${run.progressPercent || run.progress || 0}%` }} />
          </div>
          <div className="agent-progress-label">
            <span>{run.currentStep || run.status}</span>
            <span>{run.progressPercent || run.progress || 0}%</span>
          </div>
        </div>
      )}

      {/* Stats for completed runs */}
      {run.status === 'completed' && (
        <div className="agent-run-stats">
          <div className="agent-run-stat">
            <span className="agent-run-stat-value">{run.metrics?.testsGenerated || run.testsGenerated || 0}</span>
            <span className="agent-run-stat-label">Tests</span>
          </div>
          <div className="agent-run-stat">
            <span className="agent-run-stat-value" style={{ color: 'var(--success)' }}>{run.metrics?.testsPassed || run.testsPassed || 0}</span>
            <span className="agent-run-stat-label">Passed</span>
          </div>
          <div className="agent-run-stat">
            <span className="agent-run-stat-value" style={{ color: 'var(--danger)' }}>{run.metrics?.testsFailed || run.testsFailed || 0}</span>
            <span className="agent-run-stat-label">Failed</span>
          </div>
          <div className="agent-run-stat">
            <span className="agent-run-stat-value" style={{ color: 'var(--warning)' }}>{run.metrics?.bugsFound || run.bugsGenerated || 0}</span>
            <span className="agent-run-stat-label">Bugs</span>
          </div>
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  { icon: Scan,       title: 'Smart Crawl',      desc: 'Discovers pages, forms, and buttons automatically', color: 'var(--accent)' },
  { icon: TestTube2,  title: 'AI Test Gen',       desc: 'Generates Playwright scenarios using Gemini', color: 'var(--info)' },
  { icon: Play,       title: 'Auto Execute',      desc: 'Runs tests in a real browser with screenshots', color: 'var(--warning)' },
  { icon: Bug,        title: 'Bug Reports',       desc: 'Creates professional bug reports from failures', color: 'var(--danger)' },
  { icon: BarChart3,  title: 'AI Analysis',       desc: 'Root cause analysis with confidence scores', color: 'var(--success)' },
];

export default function AgentDashboardPage() {
  const { runs, loading, error, createRun, refreshRuns } = useAgent();
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState('20');
  const [depth, setDepth] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  const validateUrl = (input) => {
    try {
      const u = new URL(input.startsWith('http') ? input : `https://${input}`);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleStartRun = useCallback(async () => {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    if (!validateUrl(targetUrl)) {
      toast.error('Please enter a valid website URL');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createRun(targetUrl, {
        maxPages: parseInt(maxPages),
        depth: parseInt(depth),
      });
      toast.success('AI Agent started! Crawling website...');
      navigate(`/qa/agent/runs/${result.scanId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start agent run');
    } finally {
      setSubmitting(false);
    }
  }, [url, maxPages, depth, createRun, navigate]);

  return (
    <>
      <Topbar title="AI QA Agent" subtitle="Automated website testing powered by AI" />
      <div className="page-container">

        {/* ── Hero / URL Input ──────────────────────────────────────────── */}
        <div className="agent-hero">
          <div className="agent-hero-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                background: 'rgba(91, 108, 255, 0.12)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 className="agent-hero-title">Test Any Website</h2>
                  <span className="agent-badge agent-badge-crawling" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                    <Zap size={10} /> AI Powered
                  </span>
                </div>
              </div>
            </div>
            <p className="agent-hero-subtitle">
              Enter a URL and our AI agent will crawl the site, detect interactive elements,
              generate intelligent test scenarios, execute them in a real browser, and report any bugs found.
            </p>

            <div className="agent-url-bar">
              <div className="agent-url-input-wrap">
                <Globe size={18} className="url-icon" />
                <input
                  id="agent-url-input"
                  type="text"
                  className="agent-url-input"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !submitting && url.trim()) handleStartRun();
                  }}
                  disabled={submitting}
                />
              </div>
              <button
                id="agent-start-btn"
                className="btn btn-primary agent-start-btn"
                onClick={handleStartRun}
                disabled={submitting || !url.trim()}
              >
                {submitting ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Starting...</>
                ) : (
                  <><Play size={18} /> Start Testing</>
                )}
              </button>
            </div>

            <div className="agent-config">
              <div className="agent-config-item">
                <SearchIcon size={13} />
                <span>Max pages:</span>
                <select value={maxPages} onChange={(e) => setMaxPages(e.target.value)}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              <div className="agent-config-item">
                <span>Crawl depth:</span>
                <select value={depth} onChange={(e) => setDepth(e.target.value)}>
                  <option value="1">1 level</option>
                  <option value="2">2 levels</option>
                  <option value="3">3 levels</option>
                  <option value="5">5 levels</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── How it Works (shown when no runs yet) ────────────────────── */}
        {runs.length === 0 && !loading && (
          <div className="agent-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="agent-feature-card">
                <div className="agent-feature-icon" style={{ background: `${f.color}12`, color: f.color }}>
                  <f.icon size={20} />
                </div>
                <p className="agent-feature-title">{f.title}</p>
                <p className="agent-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Run History ───────────────────────────────────────────────── */}
        {runs.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="agent-section-header">
              <h4 className="agent-section-title">Recent Runs</h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {runs.length} total
              </span>
            </div>

            <div className="agent-runs-grid">
              {runs.map((run) => (
                <RunCard
                  key={run.scanId || run.runId}
                  run={run}
                  onClick={() => navigate(`/qa/agent/runs/${run.scanId || run.runId}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {loading && runs.length === 0 && (
          <div className="agent-empty">
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', opacity: 0.5 }} />
            <p>Loading your test runs...</p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)', fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Spin keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
