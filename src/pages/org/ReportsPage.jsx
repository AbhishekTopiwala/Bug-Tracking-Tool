import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Bug, Users, CheckCircle2, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgDashboardStats, getDefectTrends, getTeamProductivity } from '../../services/orgService';

export default function ReportsPage() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrgDashboardStats(userProfile?.organizationId);
        setStats(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (userProfile?.organizationId) load();
  }, [userProfile?.organizationId]);

  const defectTrends = stats ? getDefectTrends(stats.bugs) : [];
  const productivity = stats ? getTeamProductivity(stats.users, stats.bugs) : [];
  const resolutionRate = stats && stats.totalBugs > 0 ? Math.round((stats.closedDefects / stats.totalBugs) * 100) : 0;
  const successRate = stats?.projects?.length > 0
    ? Math.round(stats.projects.filter(p => p.status !== 'archived').length / stats.projects.length * 100) : 0;

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><BarChart3 size={24} style={{ color: 'var(--org-purple)' }} /> Reports & Analytics</h1>
          <p className="org-page-subtitle">Project success rate, defect trends, and team productivity.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Project Success Rate', value: `${successRate}%`, color: '#10B981', icon: CheckCircle2 },
          { label: 'Defect Resolution', value: `${resolutionRate}%`, color: '#7C3AED', icon: Bug },
          { label: 'Active Team Members', value: stats?.totalMembers || 0, color: '#3B82F6', icon: Users },
          { label: 'Total Defects', value: stats?.totalBugs || 0, color: '#F43F5E', icon: Activity },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="org-stat-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', margin: 0 }}>{label}</p>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}10`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} />
              </div>
            </div>
            {loading ? <div className="skeleton" style={{ width: 50, height: 28, borderRadius: 4 }} />
              : <p style={{ fontSize: '1.75rem', fontWeight: 800, color, margin: 0 }}>{value}</p>}
          </div>
        ))}
      </div>

      {/* Defect Trend Chart */}
      <div className="org-card">
        <div className="org-card-header">
          <h3 className="org-card-title"><TrendingUp size={16} style={{ color: 'var(--org-purple)' }} /> Defect Trends (30 Days)</h3>
        </div>
        <div className="org-card-body">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 24, borderRadius: 6 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
              {defectTrends.map((day, i) => {
                const maxVal = Math.max(...defectTrends.map(d => d.opened), 1);
                const h = Math.max((day.opened / maxVal) * 100, 3);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.58rem', color: '#94A3B8', fontWeight: 600 }}>{day.opened || ''}</span>
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
          )}
        </div>
      </div>

      {/* Team Productivity */}
      <div className="org-card">
        <div className="org-card-header">
          <h3 className="org-card-title"><Users size={16} style={{ color: 'var(--org-purple)' }} /> Team Productivity</h3>
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
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No data available</td></tr>
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
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{p.resolutionRate}%</span>
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
