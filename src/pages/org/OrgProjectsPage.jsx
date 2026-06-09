import { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Search, Archive, Users,
  Bug, CheckCircle2, AlertTriangle, RefreshCw, BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgProjects, archiveProject, subscribeToOrgData } from '../../services/orgService';
import toast from 'react-hot-toast';

export default function OrgProjectsPage() {
  const { currentUser, userProfile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterHealth, setFilterHealth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    try {
      const p = await getOrgProjects(userProfile.organizationId);
      setProjects(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    load();
    const unsub = subscribeToOrgData(userProfile.organizationId, () => load());
    return () => unsub();
  }, [userProfile?.organizationId, load]);

  const filtered = projects.filter(p => {
    const matchSearch = !search || (p.name || '').toLowerCase().includes(search.toLowerCase());
    const matchHealth = filterHealth === 'all' || p.health === filterHealth;
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'active' && p.status !== 'archived')
      || (filterStatus === 'archived' && p.status === 'archived');
    return matchSearch && matchHealth && matchStatus;
  });

  const activeCount = projects.filter(p => p.status !== 'archived').length;
  const archivedCount = projects.filter(p => p.status === 'archived').length;
  const avgCompletion = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.completionPct, 0) / projects.length) : 0;
  const healthyCnt = projects.filter(p => p.health === 'healthy' && p.status !== 'archived').length;

  const handleArchive = async (projectId) => {
    if (!window.confirm('Archive this project? It will be hidden from active views.')) return;
    try {
      await archiveProject(projectId, { displayName: currentUser?.displayName, email: currentUser?.email, uid: currentUser?.uid });
      toast.success('Project archived');
      await load();
    } catch (e) { toast.error('Failed to archive'); }
  };

  const healthIcon = (health) => {
    if (health === 'healthy') return <CheckCircle2 size={14} style={{ color: '#10B981' }} />;
    if (health === 'at-risk') return <AlertTriangle size={14} style={{ color: '#F59E0B' }} />;
    return <AlertTriangle size={14} style={{ color: '#EF4444' }} />;
  };

  const healthLabel = { healthy: 'Healthy', 'at-risk': 'At Risk', critical: 'Critical' };
  const healthColor = { healthy: '#10B981', 'at-risk': '#F59E0B', critical: '#EF4444' };

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title">
            <FolderKanban size={24} style={{ color: 'var(--org-purple)' }} />
            Project Overview
          </h1>
          <p className="org-page-subtitle">Monitor all projects, health metrics, and completion rates.</p>
        </div>
        <button className="org-btn-secondary" onClick={load} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Projects', value: projects.length, color: '#7C3AED' },
          { label: 'Active', value: activeCount, color: '#10B981' },
          { label: 'Archived', value: archivedCount, color: '#94A3B8' },
          { label: 'Avg Completion', value: `${avgCompletion}%`, color: '#3B82F6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="org-stat-card" style={{ padding: 18 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', margin: '0 0 8px' }}>{label}</p>
            {loading
              ? <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 4 }} />
              : <p style={{ fontSize: '1.5rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
            }
          </div>
        ))}
      </div>

      {/* Health Summary — shown only when data is loaded */}
      {!loading && projects.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['healthy', 'at-risk', 'critical'].map(h => {
            const cnt = projects.filter(p => p.health === h && p.status !== 'archived').length;
            if (cnt === 0) return null;
            return (
              <div key={h} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem',
                fontWeight: 700, border: `1px solid ${healthColor[h]}25`,
                background: `${healthColor[h]}08`, color: healthColor[h],
                cursor: 'pointer',
              }}
                onClick={() => setFilterHealth(filterHealth === h ? 'all' : h)}
              >
                {healthIcon(h)} {cnt} {healthLabel[h]}
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 42, paddingLeft: 42, border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.88rem', background: '#fff', outline: 'none' }}
          />
        </div>
        <select value={filterHealth} onChange={e => setFilterHealth(e.target.value)}
          style={{ height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.85rem', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="at-risk">At Risk</option>
          <option value="critical">Critical</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.85rem', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Projects Table */}
      <div className="org-card" style={{ padding: 0, overflow: 'visible' }}>
        <table className="org-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Health</th>
              <th>Open Bugs</th>
              <th>Closed Bugs</th>
              <th>Completion</th>
              <th>Team Size</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6, 7].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 18, borderRadius: 4, width: j === 1 ? 140 : 60 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                <FolderKanban size={36} style={{ opacity: 0.25, marginBottom: 10 }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                  {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
                </p>
              </td></tr>
            ) : (
              filtered.map(project => (
                <tr key={project.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, background: project.status === 'archived'
                          ? 'linear-gradient(135deg, #94A3B8, #CBD5E1)'
                          : 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.7rem', flexShrink: 0
                      }}>{(project.name || 'P').slice(0, 2).toUpperCase()}</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0 }}>{project.name}</p>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '1px 0 0' }}>
                          {project.status === 'archived' ? '📁 Archived' : '● Active'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {project.status === 'archived' ? (
                      <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>—</span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                        background: `${healthColor[project.health]}10`, color: healthColor[project.health],
                        border: `1px solid ${healthColor[project.health]}25`,
                      }}>
                        {healthIcon(project.health)} {healthLabel[project.health] || project.health}
                      </span>
                    )}
                  </td>
                  <td><span style={{ fontWeight: 700, color: project.openBugs > 5 ? '#EF4444' : '#334155' }}>{project.openBugs}</span></td>
                  <td><span style={{ fontWeight: 700, color: '#10B981' }}>{project.closedBugs}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="org-progress-track" style={{ width: 80 }}>
                        <div className="org-progress-fill" style={{
                          width: `${project.completionPct}%`,
                          background: project.completionPct > 70 ? '#10B981' : project.completionPct > 40 ? '#F59E0B' : '#EF4444'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>{project.completionPct}%</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', fontSize: '0.85rem' }}>
                      <Users size={13} /> {project.teamSize}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {project.status !== 'archived' && (
                        <button onClick={() => handleArchive(project.id)} title="Archive project"
                          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', border: '1px solid rgba(226,232,240,0.8)', background: '#fff', cursor: 'pointer' }}>
                          <Archive size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{
          padding: '12px 20px', background: 'rgba(248,250,252,0.6)',
          borderTop: '1px solid rgba(226,232,240,0.6)', fontSize: '0.78rem',
          color: '#94A3B8', borderRadius: '0 0 18px 18px'
        }}>
          Showing {filtered.length} of {projects.length} projects
        </div>
      </div>
    </div>
  );
}
