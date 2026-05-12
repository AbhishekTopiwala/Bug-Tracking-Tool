import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bug, CheckCircle2, Clock, AlertTriangle,
  Folder, ArrowRight, Activity, MessageSquare,
  GitPullRequest, Zap, TrendingUp, Users
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { subscribeToBugs, getProjects, subscribeToNotifications } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_COLOR = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  Low:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
};

const STATUS_COLOR = {
  Open:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'In Progress':{ color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Done:         { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Resolved:     { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Reopen:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  Reproduced:   { color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
};

function ProjectHealthCard({ project, bugs, onClick }) {
  const projectBugs = bugs.filter(b => b.projectId === project.id);
  const total = projectBugs.length;
  const resolved = projectBugs.filter(b => ['Done', 'Resolved'].includes(b.status)).length;
  const open = projectBugs.filter(b => b.status === 'Open').length;
  const inProgress = projectBugs.filter(b => b.status === 'In Progress').length;
  const critical = projectBugs.filter(b => b.priority === 'Critical' && !['Done','Resolved'].includes(b.status)).length;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const healthColor = progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Folder size={16} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{project.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{total} bugs total</div>
          </div>
        </div>
        <ArrowRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }} />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Resolution Progress</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: healthColor }}>{progress}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`,
            borderRadius: 99,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: 'rgba(59,130,246,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6' }}>{open}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Open</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(245,158,11,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{inProgress}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(16,185,129,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{resolved}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Done</div>
        </div>
        {critical > 0 && (
          <div style={{ flex: 1, background: 'rgba(239,68,68,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{critical}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ notif }) {
  const timeAgo = notif.createdAt?.seconds
    ? formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true })
    : 'just now';

  const icon = notif.type === 'status_change'
    ? <GitPullRequest size={14} style={{ color: '#6366f1' }} />
    : notif.type === 'comment'
    ? <MessageSquare size={14} style={{ color: '#f59e0b' }} />
    : <Activity size={14} style={{ color: '#10b981' }} />;

  const iconBg = notif.type === 'status_change'
    ? 'rgba(99,102,241,0.12)'
    : notif.type === 'comment'
    ? 'rgba(245,158,11,0.12)'
    : 'rgba(16,185,129,0.12)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.05))',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: notif.message }}
        />
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{timeAgo}</div>
      </div>
      {!notif.read && (
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 6 }} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [bugs, setBugs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToBugs((data) => {
      setBugs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    setProjectsLoading(true);
    getProjects(currentUser.uid, userProfile.role)
      .then(setProjects)
      .finally(() => setProjectsLoading(false));
  }, [currentUser, userProfile?.role]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs.slice(0, 15));
    });
    return () => unsub();
  }, [currentUser]);

  const myBugs = useMemo(() => {
    const myProjectIds = projects.map(p => p.id);
    if (userProfile?.role === 'Admin') return bugs;
    return bugs.filter(b => myProjectIds.includes(b.projectId));
  }, [bugs, projects, userProfile?.role]);

  const stats = useMemo(() => ({
    total: myBugs.length,
    open: myBugs.filter(b => b.status === 'Open').length,
    inProgress: myBugs.filter(b => b.status === 'In Progress').length,
    resolved: myBugs.filter(b => ['Done', 'Resolved'].includes(b.status)).length,
    critical: myBugs.filter(b => b.priority === 'Critical' && !['Done','Resolved'].includes(b.status)).length,
  }), [myBugs]);

  // Needs verification: bugs reporter by me that are Done/Resolved
  const needsVerification = useMemo(() =>
    myBugs.filter(b => b.reportedBy === currentUser?.uid && ['Done', 'Resolved'].includes(b.status)).slice(0, 4),
    [myBugs, currentUser]
  );

  const firstName = userProfile?.displayName?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { label: 'Total Bugs', value: stats.total, icon: Bug, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Open', value: stats.open, icon: AlertTriangle, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  ];

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={`${greeting}, ${firstName} 👋 — Here's your QA pipeline summary`}
      />
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 40 }}>

        {/* Stats Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          {statCards.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main 2-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

          {/* LEFT — Project Health Cards */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>My Projects</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Health overview across all your assigned projects</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/qa/projects')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {projectsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <Folder size={48} style={{ opacity: 0.3 }} />
                <h3 style={{ fontSize: '1rem' }}>No projects assigned</h3>
                <p style={{ fontSize: '0.85rem' }}>Ask your Admin to add you to a project.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
                {projects.map(project => (
                  <ProjectHealthCard
                    key={project.id}
                    project={project}
                    bugs={myBugs}
                    onClick={() => navigate(`/qa/bugs?project=${encodeURIComponent(project.name)}`)}
                  />
                ))}
              </div>
            )}

            {/* Needs Verification Section */}
            {needsVerification.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Needs Your Verification</h2>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Bugs you reported that developers marked as resolved</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {needsVerification.map(bug => {
                    const pc = PRIORITY_COLOR[bug.priority] || PRIORITY_COLOR.Medium;
                    const sc = STATUS_COLOR[bug.status] || {};
                    return (
                      <div
                        key={bug.id}
                        onClick={() => navigate(`/qa/bugs/${bug.id}`)}
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 3 }}>{bug.bugKey}</div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bug.title}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pc.color, background: pc.bg, padding: '3px 8px', borderRadius: 6 }}>{bug.priority}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: sc.color, background: sc.bg, padding: '3px 8px', borderRadius: 6 }}>{bug.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Live Activity Feed */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
            position: 'sticky',
            top: 100,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Live Activity</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Real-time updates on your bugs</p>
              </div>
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700,
                  background: '#6366f1', color: '#fff',
                  padding: '2px 8px', borderRadius: 99,
                }}>
                  {notifications.filter(n => !n.read).length} new
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <Zap size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
                <p style={{ fontSize: '0.82rem', margin: 0 }}>No activity yet.</p>
                <p style={{ fontSize: '0.75rem', margin: '4px 0 0', opacity: 0.7 }}>Updates will appear here when Devs act on your bugs.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>
                {notifications.map(n => <ActivityItem key={n.id} notif={n} />)}
              </div>
            )}

            <button
              onClick={() => navigate('/qa/notifications')}
              style={{
                width: '100%', marginTop: 16, padding: '9px 0',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem',
                fontWeight: 600, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              View All Notifications <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
