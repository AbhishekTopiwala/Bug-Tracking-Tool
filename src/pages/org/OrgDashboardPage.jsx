import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, FolderKanban, Bug, Code2, TestTube2,
  TrendingUp, ArrowRight, Crown, Activity, CheckCircle2,
  AlertTriangle, BarChart3, Shield, RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgDashboardStats, getDefectTrends, subscribeToOrgData } from '../../services/orgService';

export default function OrgDashboardPage() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadStats = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    try {
      const data = await getOrgDashboardStats(userProfile.organizationId);
      setStats(data);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('[OrgDashboard] Error:', e);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    // Initial load
    loadStats();
    // Real-time subscription — re-fetch whenever any org data changes
    const unsub = subscribeToOrgData(userProfile.organizationId, () => {
      loadStats();
    });
    return () => unsub();
  }, [userProfile?.organizationId, loadStats]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.displayName?.split(' ')[0] || 'Owner';

  const defectTrends = stats ? getDefectTrends(stats.bugs) : [];

  const statCards = stats ? [
    { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', accent: 'purple', link: '/org/projects' },
    { label: 'Active Projects', value: stats.activeProjects, icon: Activity, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', accent: 'blue', link: '/org/projects' },
    { label: 'Total Managers', value: stats.totalAdmins, icon: Crown, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', accent: 'amber', link: '/org/admins' },
    { label: 'QA Engineers', value: stats.totalQA, icon: TestTube2, color: '#10B981', bg: 'rgba(16,185,129,0.08)', accent: 'emerald', link: '/org/team' },
    { label: 'Developers', value: stats.totalDevelopers, icon: Code2, color: '#6366F1', bg: 'rgba(99,102,241,0.08)', accent: 'indigo', link: '/org/team' },
    { label: 'Total Members', value: stats.totalMembers, icon: Users, color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)', accent: 'blue', link: '/org/team' },
    { label: 'Open Defects', value: stats.openDefects, icon: Bug, color: '#F43F5E', bg: 'rgba(244,63,94,0.08)', accent: 'rose', link: '/org/reports' },
    { label: 'Closed Defects', value: stats.closedDefects, icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.08)', accent: 'emerald', link: '/org/reports' },
  ] : [];

  // Defect resolution rate
  const resolutionRate = stats && stats.totalBugs > 0
    ? Math.round((stats.closedDefects / stats.totalBugs) * 100)
    : 0;

  // Recent projects (top 5)
  const recentProjects = stats?.projects
    ?.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5) || [];

  return (
    <div className="org-container">
      {/* ── Header ── */}
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title">
            <Building2 size={24} style={{ color: 'var(--org-purple)' }} />
            Organization Overview
          </h1>
          <p className="org-page-subtitle">
            {greeting}, {firstName} 👋 — Here's your organization at a glance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500 }}>
              Live · Updated {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button className="org-btn-secondary" onClick={loadStats} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="org-btn-primary" onClick={() => navigate('/org/admins')}>
            <Users size={16} />
            Manage Admins
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="org-stat-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: 50, height: 28, borderRadius: 6 }} />
            </div>
          ))
        ) : (
          statCards.map(({ label, value, icon: Icon, color, bg, accent, link }) => (
            <div
              key={label}
              className={`org-stat-card org-stat-card--${accent}`}
              onClick={() => link && navigate(link)}
              style={{ cursor: link ? 'pointer' : 'default' }}
            >
              <div className="org-stat-header">
                <p className="org-stat-label">{label}</p>
                <div className="org-stat-icon" style={{ background: bg, color }}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="org-stat-value">{value ?? '—'}</p>
              {link && (
                <p className="org-stat-footer" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  View details <ArrowRight size={12} />
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Bottom Section ── */}
      <div className="org-grid-2-1">
        {/* Defect Trend Chart */}
        <div className="org-card">
          <div className="org-card-header">
            <h3 className="org-card-title">
              <BarChart3 size={16} style={{ color: 'var(--org-purple)' }} />
              Defect Trends (30 Days)
            </h3>
            <button className="org-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => navigate('/org/reports')}>
              Full Report <ArrowRight size={12} />
            </button>
          </div>
          <div className="org-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 20, borderRadius: 6 }} />)}
              </div>
            ) : defectTrends.every(d => d.opened === 0) ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
                <Bug size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No defects reported in the last 30 days</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Mini bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                  {defectTrends.slice(-14).map((day, i) => {
                    const maxVal = Math.max(...defectTrends.slice(-14).map(d => d.opened), 1);
                    const h = Math.max((day.opened / maxVal) * 100, 4);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: '100%',
                          height: `${h}%`,
                          background: day.opened > 3 ? 'linear-gradient(180deg, #F43F5E, #FDA4AF)' : 'linear-gradient(180deg, #7C3AED, #A78BFA)',
                          borderRadius: 4,
                          transition: 'height 0.5s ease',
                          minHeight: 4
                        }} title={`${day.label}: ${day.opened} opened`} />
                        {i % 2 === 0 && (
                          <span style={{ fontSize: '0.6rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{day.label.split(' ')[1]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Summary row */}
                <div style={{ display: 'flex', gap: 24, paddingTop: 12, borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: '#7C3AED' }} />
                    <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Normal</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: '#F43F5E' }} />
                    <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>High Volume</span>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                    Resolution Rate: <span style={{ color: resolutionRate > 70 ? '#10B981' : '#F59E0B' }}>{resolutionRate}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="org-card">
          <div className="org-card-header">
            <h3 className="org-card-title">
              <FolderKanban size={16} style={{ color: 'var(--org-purple)' }} />
              Recent Projects
            </h3>
            <button className="org-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => navigate('/org/projects')}>
              View All
            </button>
          </div>
          <div style={{ padding: '8px 16px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10 }} />)}
              </div>
            ) : recentProjects.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                <FolderKanban size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ fontWeight: 600 }}>No projects yet</p>
              </div>
            ) : (
              recentProjects.map(project => (
                <div key={project.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px',
                  borderBottom: '1px solid rgba(226,232,240,0.4)', cursor: 'pointer'
                }}
                  onClick={() => navigate('/org/projects')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.75rem', flexShrink: 0
                  }}>
                    {(project.name || 'P').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '2px 0 0' }}>
                      {project.assignedUsers?.length || 0} members
                    </p>
                  </div>
                  <span className={`org-status-pill ${project.status === 'archived' ? 'org-status-inactive' : 'org-status-active'}`}>
                    {project.status === 'archived' ? 'Archived' : 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Role Distribution ── */}
      <div className="org-grid-3">
        {[
          { label: 'Organization Owners', count: stats?.totalOrgOwners || 0, icon: Shield, color: '#7C3AED' },
          { label: 'Administrators', count: stats?.totalAdmins || 0, icon: Crown, color: '#F59E0B' },
          { label: 'QA Engineers', count: stats?.totalQA || 0, icon: TestTube2, color: '#10B981' },
        ].map(({ label, count, icon: Icon, color }) => {
          const total = stats?.totalMembers || 1;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={label} className="org-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: `${color}12`, color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '2px 0 0' }}>{pct}% of organization</p>
                </div>
                <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.25rem', color }}>{loading ? '–' : count}</span>
              </div>
              <div className="org-progress-track">
                <div className="org-progress-fill" style={{ width: loading ? '0%' : `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
