import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Bug, Users, CheckCircle2, Activity, RefreshCw, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgDashboardStats, getDefectTrends, getTeamProductivity, subscribeToOrgData } from '../../services/orgService';

export default function ReportsPage() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    try {
      const data = await getOrgDashboardStats(userProfile.organizationId);
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    load();
    const unsub = subscribeToOrgData(userProfile.organizationId, () => load());
    return () => unsub();
  }, [userProfile?.organizationId, load]);

  const defectTrends = stats ? getDefectTrends(stats.bugs) : [];
  const productivity = stats ? getTeamProductivity(stats.users, stats.bugs) : [];
  const resolutionRate = stats && stats.totalBugs > 0 ? Math.round((stats.closedDefects / stats.totalBugs) * 100) : 0;
  const successRate = stats?.projects?.length > 0
    ? Math.round(stats.projects.filter(p => p.status !== 'archived').length / stats.projects.length * 100) : 0;

  // Last 7 days defects vs previous 7 days
  const last7 = defectTrends.slice(-7).reduce((s, d) => s + d.opened, 0);
  const prev7 = defectTrends.slice(-14, -7).reduce((s, d) => s + d.opened, 0);
  const trendPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><BarChart3 size={24} style={{ color: 'var(--org-purple)' }} /> Reports & Analytics</h1>
          <p className="org-page-subtitle">Project success rate, defect trends, and team productivity.</p>
        </div>
        <button className="org-btn-secondary" onClick={load} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Project Success Rate', value: `${successRate}%`, color: '#10B981', icon: CheckCircle2, sub: `${stats?.projects?.filter(p => p.status !== 'archived').length || 0} active / ${stats?.projects?.length || 0} total` },
          { label: 'Defect Resolution', value: `${resolutionRate}%`, color: '#7C3AED', icon: Bug, sub: `${stats?.closedDefects || 0} of ${stats?.totalBugs || 0} resolved` },
          { label: 'Active Team Members', value: stats?.totalMembers || 0, color: '#3B82F6', icon: Users, sub: `Across all projects` },
          { label: 'Open Defects', value: stats?.openDefects || 0, color: '#F43F5E', icon: Activity, sub: `${last7} in last 7 days` },
        ].map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="org-stat-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', margin: 0 }}>{label}</p>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}10`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} />
              </div>
            </div>
            {loading ? <div className="skeleton" style={{ width: 50, height: 28, borderRadius: 4 }} />
              : <p style={{ fontSize: '1.75rem', fontWeight: 800, color, margin: 0 }}>{value}</p>}
            {!loading && sub && <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '4px 0 0', fontWeight: 500 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Week-over-week trend */}
      {!loading && stats?.totalBugs > 0 && (
        <div className="org-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {trendPct < 0 ? <TrendingDown size={18} style={{ color: '#10B981' }} /> : <TrendingUp size={18} style={{ color: trendPct > 0 ? '#F43F5E' : '#64748B' }} />}
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', margin: 0 }}>
                  Defects this week: <span style={{ color: trendPct < 0 ? '#10B981' : trendPct > 0 ? '#F43F5E' : '#64748B' }}>{last7}</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '2px 0 0' }}>
                  vs {prev7} last week
                  {prev7 > 0 && ` · ${trendPct > 0 ? '+' : ''}${trendPct}% change`}
                </p>
              </div>
            </div>
            <span style={{
              padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem',
              background: trendPct < 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
              color: trendPct < 0 ? '#10B981' : '#F43F5E',
            }}>
              {trendPct < 0 ? '↓ Improving' : trendPct > 0 ? '↑ More defects' : '→ Stable'}
            </span>
          </div>
        </div>
      )}

      {/* Defect Trend Chart */}
      <div className="org-card">
        <div className="org-card-header">
          <h3 className="org-card-title"><TrendingUp size={16} style={{ color: 'var(--org-purple)' }} /> Defect Trends (30 Days)</h3>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
            {stats?.totalBugs || 0} total bugs
          </span>
        </div>
        <div className="org-card-body">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 24, borderRadius: 6 }} />)}
            </div>
          ) : defectTrends.every(d => d.opened === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
              <Bug size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>No defects reported in the last 30 days</p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>Great job! Keep the quality high.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
                {defectTrends.map((day, i) => {
                  const maxVal = Math.max(...defectTrends.map(d => d.opened), 1);
                  const h = Math.max((day.opened / maxVal) * 100, 3);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      {day.opened > 0 && <span style={{ fontSize: '0.58rem', color: '#94A3B8', fontWeight: 600 }}>{day.opened}</span>}
                      <div style={{
                        width: '100%', height: `${h}%`, borderRadius: 4, minHeight: 3,
                        background: day.opened > 3 ? 'linear-gradient(180deg,#F43F5E,#FDA4AF)' : 'linear-gradient(180deg,#7C3AED,#C4B5FD)',
                        transition: 'height 0.6s ease'
                      }} title={`${day.label}: ${day.opened} opened`} />
                      {i % 3 === 0 && <span style={{ fontSize: '0.58rem', color: '#94A3B8' }}>{day.label.split(' ')[1]}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, padding: '12px 0', borderTop: '1px solid rgba(226,232,240,0.6)', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Open: <strong style={{ color: '#F43F5E' }}>{stats?.openDefects || 0}</strong></span>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Closed: <strong style={{ color: '#10B981' }}>{stats?.closedDefects || 0}</strong></span>
                <span style={{ color: '#64748B', fontWeight: 600, marginLeft: 'auto' }}>Resolution Rate: <strong style={{ color: resolutionRate > 70 ? '#10B981' : '#F59E0B' }}>{resolutionRate}%</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team Productivity */}
      <div className="org-card">
        <div className="org-card-header">
          <h3 className="org-card-title"><Users size={16} style={{ color: 'var(--org-purple)' }} /> Team Productivity</h3>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
            {productivity.length} active contributors
          </span>
        </div>
        <div style={{ padding: 0 }}>
          <table className="org-table">
            <thead>
              <tr><th>Member</th><th>Role</th><th>Total Bugs</th><th>Resolved</th><th>Resolution Rate</th></tr>
            </thead>
            <tbody>
              {loading ? [1, 2, 3].map(i => (
                <tr key={i}>{[1, 2, 3, 4, 5].map(j => <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4, width: 60 }} /></td>)}</tr>
              )) : productivity.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>No team activity data yet</p>
                  <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>Data appears once bugs are assigned to team members.</p>
                </td></tr>
              ) : productivity.slice(0, 15).map(p => (
                <tr key={p.id}>
                  <td><span style={{ fontWeight: 700, color: '#0F172A' }}>{p.name}</span></td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      background: p.role === 'QA' ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
                      color: p.role === 'QA' ? '#10B981' : '#6366F1'
                    }}>{p.role}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#334155' }}>{p.totalBugs}</td>
                  <td style={{ fontWeight: 700, color: '#10B981' }}>{p.resolvedBugs}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="org-progress-track" style={{ width: 80 }}>
                        <div className="org-progress-fill" style={{
                          width: `${p.resolutionRate}%`,
                          background: p.resolutionRate > 70 ? '#10B981' : p.resolutionRate > 40 ? '#F59E0B' : '#EF4444'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: p.resolutionRate > 70 ? '#10B981' : p.resolutionRate > 40 ? '#F59E0B' : '#EF4444' }}>{p.resolutionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
