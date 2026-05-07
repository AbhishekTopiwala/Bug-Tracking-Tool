import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, Bug, Filter,
  ArrowRight, Code2, X, Zap, TrendingUp, Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Topbar from '../../components/Topbar';
import { subscribeToBugs } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

const statusClass = {
  Open: 'badge-open',
  'In Progress': 'badge-inprogress',
  Done: 'badge-done',
  Resolved: 'badge-resolved',
  Reopened: 'badge-reopened',
};
const priorityClass = {
  Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Critical: 'badge-critical',
};

const PRIORITY_COLOR = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#94a3b8',
};

const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Done', 'Reopened'];
const PRIORITY_FILTERS = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function DevDashboardPage() {
  const [allBugs, setAllBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const projectFilter = queryParams.get('project');

  useEffect(() => {
    const unsub = subscribeToBugs((bugs) => {
      setAllBugs(bugs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const baseBugs = useMemo(() => {
    if (projectFilter) return allBugs.filter(b => b.projectName === projectFilter);
    return allBugs.filter((b) => b.assigneeId === currentUser?.uid);
  }, [allBugs, currentUser, projectFilter]);

  const filtered = useMemo(() => {
    return baseBugs.filter((bug) => {
      if (statusFilter !== 'All' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && bug.priority !== priorityFilter) return false;
      return true;
    });
  }, [baseBugs, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: baseBugs.length,
    open: baseBugs.filter((b) => b.status === 'Open').length,
    inProgress: baseBugs.filter((b) => b.status === 'In Progress').length,
    done: baseBugs.filter((b) => ['Done', 'Resolved'].includes(b.status)).length,
    critical: baseBugs.filter((b) => b.priority === 'Critical' && !['Done', 'Resolved'].includes(b.status)).length,
  }), [baseBugs]);

  const timeAgo = useCallback((bug) => bug.createdAt?.seconds
    ? formatDistanceToNow(new Date(bug.createdAt.seconds * 1000), { addSuffix: true })
    : 'Recently', []);

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Developer';

  const statCards = useMemo(() => [
    {
      label: projectFilter ? 'Total Bugs' : 'Assigned to Me',
      value: stats.total,
      icon: Bug,
      color: 'var(--dev-accent)',
      bg: 'var(--dev-accent-light)',
      border: 'rgba(16,185,129,0.2)',
    },
    {
      label: 'Open',
      value: stats.open,
      icon: Circle,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.08)',
      border: 'rgba(59,130,246,0.15)',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Zap,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.15)',
    },
    {
      label: 'Resolved',
      value: stats.done,
      icon: CheckCircle2,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.15)',
    },
  ], [stats, projectFilter]);

  return (
    <>
      <Topbar title={projectFilter ? `Project: ${projectFilter}` : 'My Dashboard'} />
      <div className="page-container">

        {/* Project Filter Banner */}
        {projectFilter && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            padding: '10px 16px', background: 'rgba(16,185,129,0.06)',
            borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <Filter size={14} style={{ color: 'var(--dev-accent)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Filtering by project: <span style={{ color: 'var(--dev-accent)' }}>{projectFilter}</span>
            </span>
            <button
              onClick={() => navigate('/dev')}
              style={{
                marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              <X size={12} /> Clear
            </button>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="dev-welcome-banner" style={{ marginBottom: 28 }}>
          <div className="dev-welcome-icon">
            <Code2 size={22} style={{ color: 'var(--dev-accent)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 4 }}>
              {projectFilter
                ? <>Project Overview · <span style={{ color: 'var(--dev-accent)' }}>{projectFilter}</span></>
                : <>Hey, <span style={{ color: 'var(--dev-accent)' }}>{firstName}</span> 👋</>
              }
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {projectFilter
                ? `Showing all bugs tracked under this project.`
                : stats.total === 0
                  ? "No bugs assigned yet — you're all clear!"
                  : <>You have <strong style={{ color: stats.open > 0 ? '#3b82f6' : 'var(--text-primary)' }}>{stats.open} open</strong> and <strong style={{ color: stats.inProgress > 0 ? '#f59e0b' : 'var(--text-primary)' }}>{stats.inProgress} in‑progress</strong> bugs.</>
              }
            </p>
          </div>
          {stats.critical > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(239,68,68,0.08)', borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.8rem',
              color: '#ef4444', fontWeight: 700, flexShrink: 0,
            }}>
              <AlertTriangle size={13} /> {stats.critical} Critical
            </div>
          )}
          {!projectFilter && stats.inProgress > 0 && stats.critical === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(245,158,11,0.08)', borderRadius: 10,
              border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem',
              color: '#f59e0b', fontWeight: 700, flexShrink: 0,
            }}>
              <Zap size={13} /> {stats.inProgress} Active
            </div>
          )}
        </div>

        {/* Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}>
          {statCards.map((s) => (
            <div
              key={s.label}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${s.border}`,
                borderRadius: 16,
                padding: '20px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: s.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20,
          padding: '16px 20px', background: 'var(--bg-card)',
          borderRadius: 14, border: '1px solid var(--border)',
        }}>
          <div>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Status
            </p>
            <div className="filter-bar">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                  style={statusFilter === s ? { background: 'var(--dev-accent-light)', borderColor: 'rgba(16,185,129,0.35)', color: 'var(--dev-accent)', fontWeight: 700 } : {}}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
          <div>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Priority
            </p>
            <div className="filter-bar">
              {PRIORITY_FILTERS.map((p) => (
                <button
                  key={p}
                  className={`filter-chip ${priorityFilter === p ? 'active' : ''}`}
                  style={priorityFilter === p ? { background: 'var(--dev-accent-light)', borderColor: 'rgba(16,185,129,0.35)', color: 'var(--dev-accent)', fontWeight: 700 } : {}}
                  onClick={() => setPriorityFilter(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {(statusFilter !== 'All' || priorityFilter !== 'All') && (
            <button
              onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); }}
              style={{
                marginLeft: 'auto', alignSelf: 'flex-end',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 5, color: 'var(--text-muted)', transition: 'all 0.2s',
              }}
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>

        {/* Bug List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, padding: '64px 32px',
            background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--dev-accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={32} style={{ color: 'var(--dev-accent)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>
                {baseBugs.length === 0 ? 'All clear!' : 'No matches'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6 }}>
                {baseBugs.length === 0
                  ? 'No bugs have been assigned to you yet. You\'ll be notified when a QA assigns one.'
                  : 'No bugs match your current filters. Try adjusting the status or priority.'}
              </p>
            </div>
            {(statusFilter !== 'All' || priorityFilter !== 'All') && (
              <button
                className="btn btn-secondary"
                onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); }}
                style={{ borderRadius: 10 }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-secondary)',
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {baseBugs.length} bugs
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <TrendingUp size={12} />
                Sorted by newest
              </div>
            </div>

            {/* Bug Rows */}
            {filtered.map((bug, idx) => (
              <div
                key={bug.id}
                className="dev-bug-row"
                onClick={() => navigate(`/dev/bugs/${bug.id}`)}
                style={{ borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--border)' }}
              >
                {/* Priority bar */}
                <div style={{
                  width: 4, height: 40, borderRadius: 4, flexShrink: 0,
                  background: PRIORITY_COLOR[bug.priority] || '#94a3b8',
                }} />

                {/* Title + Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="dev-bug-title" style={{ marginBottom: 4 }}>{bug.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                      #{(bug.bugKey || bug.id.slice(-6).toUpperCase())}
                    </span>
                    {bug.projectName && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--dev-accent)', fontWeight: 600 }}>
                          {bug.projectName}
                        </span>
                      </>
                    )}
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {timeAgo(bug)}
                    </span>
                    {bug.comments?.length > 0 && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>💬 {bug.comments.length}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="dev-bug-meta">
                  <span className={`badge ${statusClass[bug.status] || 'badge-open'}`}>{bug.status}</span>
                  <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
