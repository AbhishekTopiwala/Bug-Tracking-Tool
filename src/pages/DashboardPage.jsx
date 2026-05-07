import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bug, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  Plus, Filter, SortDesc, ChevronDown, UserCircle
} from 'lucide-react';
import BugCard from '../components/BugCard';
import Topbar from '../components/Topbar';
import { subscribeToBugs } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

function FilterDropdown({ icon: Icon, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
          background: open ? 'var(--bg-card)' : 'var(--bg-secondary)', 
          border: '1px solid',
          borderColor: open ? 'var(--border)' : 'transparent',
          borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
          color: 'var(--text-secondary)'
        }}
        onMouseOver={(e) => { if (!open) e.currentTarget.style.background = 'var(--border)'; }}
        onMouseOut={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
      >
        <Icon size={16} style={{ color: value !== 'All' ? 'var(--accent)' : 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}:</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: value !== 'All' ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</span>
        <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 100,
          display: 'flex', flexDirection: 'column', minWidth: 160, gap: 2
        }}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: '8px 12px', textAlign: 'left', border: 'none', background: 'transparent',
                borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                color: value === opt ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: value === opt ? 600 : 500,
                backgroundColor: value === opt ? 'var(--accent-light)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
              onMouseOut={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUSES = ['All', 'Open', 'In Progress', 'Done', 'Resolved', 'Reopened'];
const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function DashboardPage() {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToBugs((data) => {
      setBugs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const stats = useMemo(() => ({
    total: bugs.length,
    open: bugs.filter((b) => b.status === 'Open').length,
    inProgress: bugs.filter((b) => b.status === 'In Progress').length,
    done: bugs.filter((b) => b.status === 'Done').length,
    resolved: bugs.filter((b) => b.status === 'Resolved').length,
    critical: bugs.filter((b) => b.priority === 'Critical').length,
  }), [bugs]);

  const assignees = useMemo(() => {
    const names = [...new Set(bugs.filter((b) => b.assigneeName).map((b) => b.assigneeName))];
    return ['All', ...names];
  }, [bugs]);

  const filtered = useMemo(() => {
    return bugs.filter((bug) => {
      if (statusFilter !== 'All' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && bug.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'All' && bug.assigneeName !== assigneeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          bug.title?.toLowerCase().includes(q) ||
          bug.description?.toLowerCase().includes(q) ||
          bug.bugKey?.toLowerCase().includes(q) ||
          bug.id?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bugs, statusFilter, priorityFilter, assigneeFilter, searchQuery]);

  const statCards = [
    { label: 'Total Bugs', value: stats.total, icon: Bug, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Open', value: stats.open, icon: AlertTriangle, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  ];

  return (
    <>
      <Topbar title="Dashboard" onSearch={setSearchQuery} />
      <div className="page-container">
        {/* Welcome */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span className="text-gradient">{userProfile?.displayName?.split(' ')[0] || 'there'}</span> 👋
            </h1>
            <p className="page-subtitle">Here's a summary of your QA pipeline today</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {statCards.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={22} color={s.color} />
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterDropdown
            icon={Filter}
            label="Status"
            value={statusFilter}
            options={STATUSES}
            onChange={setStatusFilter}
          />
          <FilterDropdown
            icon={AlertTriangle}
            label="Priority"
            value={priorityFilter}
            options={PRIORITIES}
            onChange={setPriorityFilter}
          />
          {assignees.length > 1 && (
            <FilterDropdown
              icon={UserCircle}
              label="Assignee"
              value={assigneeFilter}
              options={assignees}
              onChange={setAssigneeFilter}
            />
          )}
        </div>

        {/* Bug Grid */}
        {loading ? (
          <div className="grid-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 180 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Bug size={64} />
            <h3>No bugs found</h3>
            <p>
              {searchQuery || statusFilter !== 'All' || priorityFilter !== 'All'
                ? 'Try adjusting your filters or search query.'
                : 'Great news! No bugs reported yet.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {bugs.length} bugs
              </span>
            </div>
            <div className="grid-auto">
              {filtered.map((bug) => (
                <BugCard key={bug.id} bug={bug} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
