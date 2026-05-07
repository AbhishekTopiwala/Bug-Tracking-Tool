import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, Bug, Filter,
  ArrowRight, Code2, TrendingUp, X
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

  // Filter bugs based on project if active, otherwise only assigned to me
  const baseBugs = useMemo(() => {
    if (projectFilter) {
      return allBugs.filter(b => b.projectName === projectFilter);
    }
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
    done: baseBugs.filter((b) => b.status === 'Done').length,
  }), [baseBugs]);

  const timeAgo = (bug) => bug.createdAt?.seconds
    ? formatDistanceToNow(new Date(bug.createdAt.seconds * 1000), { addSuffix: true })
    : 'Recently';

  const statCards = [
    { label: projectFilter ? 'Total Bugs' : 'Assigned to Me', value: stats.total, icon: Bug, color: 'var(--dev-accent)', bg: 'var(--dev-accent-light)' },
    { label: 'Open', value: stats.open, icon: AlertTriangle, color: 'var(--status-open)', bg: 'rgba(59,130,246,0.1)' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'var(--status-inprogress)', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Resolved', value: stats.done, icon: CheckCircle2, color: 'var(--status-done)', bg: 'rgba(34,197,94,0.1)' },
  ];

  return (
    <>
      <Topbar title={projectFilter ? `Project: ${projectFilter}` : "My Bugs"} />
      <div className="page-container">
        {projectFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '8px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <Filter size={14} style={{ color: 'var(--dev-accent)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filtering by project: <span style={{ color: 'var(--dev-accent)' }}>{projectFilter}</span></span>
            <button 
              onClick={() => navigate('/dev')}
              style={{ marginLeft: 'auto', background: 'var(--bg-secondary)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}
            >
              <X size={12} /> Clear Filter
            </button>
          </div>
        )}
        {/* Welcome Banner */}
        <div className="dev-welcome-banner">
          <div className="dev-welcome-icon">
            <Code2 size={24} style={{ color: 'var(--dev-accent)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
              {projectFilter ? `Project Overview` : <>Hey, <span style={{ color: 'var(--dev-accent)' }}>{userProfile?.displayName?.split(' ')[0] || 'Developer'}</span> 👋</>}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {projectFilter 
                ? `Showing all bugs for the ${projectFilter} project.`
                : <>You have <strong style={{ color: stats.open > 0 ? 'var(--status-open)' : 'var(--text-primary)' }}>{stats.open} open</strong> and <strong style={{ color: stats.inProgress > 0 ? 'var(--status-inprogress)' : 'var(--text-primary)' }}>{stats.inProgress} in-progress</strong> bugs assigned to you.</>
              }
            </p>
          </div>
          {!projectFilter && stats.inProgress > 0 && (
            <div style={{ padding: '8px 14px', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem', color: 'var(--status-inprogress)', fontWeight: 600 }}>
              🔥 {stats.inProgress} Active
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          {statCards.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={22} style={{ color: s.color }} />
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Status</p>
            <div className="filter-bar">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                  style={statusFilter === s ? { background: 'var(--dev-accent-light)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--dev-accent)' } : {}}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Priority</p>
            <div className="filter-bar">
              {PRIORITY_FILTERS.map((p) => (
                <button
                  key={p}
                  className={`filter-chip ${priorityFilter === p ? 'active' : ''}`}
                  style={priorityFilter === p ? { background: 'var(--dev-accent-light)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--dev-accent)' } : {}}
                  onClick={() => setPriorityFilter(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bug List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={64} style={{ color: 'var(--dev-accent)', opacity: 0.3 }} />
            <h3>
              {baseBugs.length === 0
                ? 'No bugs assigned yet'
                : 'No bugs match your filters'}
            </h3>
            <p>
              {baseBugs.length === 0
                ? 'Great! No bugs have been assigned to you yet. When a QA assigns a bug to you, it will appear here.'
                : 'Try adjusting your status or priority filters.'}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {baseBugs.length} assigned bugs
              </span>
            </div>
            {filtered.map((bug) => (
              <div
                key={bug.id}
                className="dev-bug-row"
                onClick={() => navigate(`/dev/bugs/${bug.id}`)}
              >
                {/* Priority dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: bug.priority === 'Critical' ? 'var(--priority-critical)'
                    : bug.priority === 'High' ? 'var(--priority-high)'
                    : bug.priority === 'Medium' ? 'var(--priority-medium)'
                    : 'var(--priority-low)',
                  boxShadow: `0 0 6px currentColor`,
                }} />

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="dev-bug-title">{bug.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    #{bug.id.slice(-6).toUpperCase()} · {bug.projectName && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{bug.projectName}</span>}{bug.projectName && ' · '}reported by {bug.reportedByName || 'QA'} · {timeAgo(bug)}
                  </p>
                </div>

                {/* Badges */}
                <div className="dev-bug-meta">
                  <span className={`badge ${statusClass[bug.status] || 'badge-open'}`}>{bug.status}</span>
                  <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                  {bug.comments?.length > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>💬 {bug.comments.length}</span>
                  )}
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
