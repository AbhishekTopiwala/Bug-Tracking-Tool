import { useState, useEffect, useCallback } from 'react';
import { UsersRound, Search, Code2, TestTube2, Crown, Shield, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgTeamMembers, getTeamDistribution, subscribeToOrgData } from '../../services/orgService';

export default function TeamVisibilityPage() {
  const { userProfile } = useAuth();
  const [members, setMembers] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    try {
      const [m, d] = await Promise.all([
        getOrgTeamMembers(userProfile.organizationId),
        getTeamDistribution(userProfile.organizationId),
      ]);
      setMembers(m);
      setDistribution(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    load();
    const unsub = subscribeToOrgData(userProfile.organizationId, () => load());
    return () => unsub();
  }, [userProfile?.organizationId, load]);

  const active = members.filter(u => u.isActive !== false);
  const inactive = members.filter(u => u.isActive === false);

  const filtered = members.filter(u => {
    const matchSearch = !search || (u.displayName || u.name || u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'active' && u.isActive !== false)
      || (filterStatus === 'inactive' && u.isActive === false);
    return matchSearch && matchRole && matchStatus;
  });

  const roleColors = { Admin: '#F59E0B', Manager: '#3B82F6', OrgOwner: '#7C3AED', QA: '#10B981', Developer: '#6366F1' };
  const roleIcons = { Admin: Crown, Manager: Crown, OrgOwner: Shield, QA: TestTube2, Developer: Code2 };

  // Role breakdown
  const roles = members.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><UsersRound size={24} style={{ color: 'var(--org-purple)' }} /> Team Visibility</h1>
          <p className="org-page-subtitle">View all QAs, Developers, and team distribution across projects.</p>
        </div>
        <button className="org-btn-secondary" onClick={load} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Members', value: members.length, color: '#7C3AED' },
          { label: 'Active', value: active.length, color: '#10B981' },
          { label: 'Inactive', value: inactive.length, color: '#F43F5E' },
          { label: 'Distinct Roles', value: Object.keys(roles).length, color: '#3B82F6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="org-stat-card" style={{ padding: 18 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', margin: '0 0 8px' }}>{label}</p>
            {loading ? <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 4 }} />
              : <p style={{ fontSize: '1.5rem', fontWeight: 800, color, margin: 0 }}>{value}</p>}
          </div>
        ))}
      </div>

      {/* Role Breakdown — only shown when data loaded */}
      {!loading && Object.keys(roles).length > 0 && (
        <div className="org-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} style={{ color: 'var(--org-purple)' }} /> Role Breakdown
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(roles).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
              const color = roleColors[role] || '#64748B';
              const RIcon = roleIcons[role] || Shield;
              const pct = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
              return (
                <div key={role} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 12, border: `1px solid ${color}20`,
                  background: `${color}08`, cursor: 'pointer',
                  outline: filterRole === role ? `2px solid ${color}` : 'none',
                }}
                  onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RIcon size={14} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', margin: 0 }}>{role}</p>
                    <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>{count} members · {pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Distribution per Project */}
      {distribution.length > 0 && (
        <div className="org-card">
          <div className="org-card-header">
            <h3 className="org-card-title"><UsersRound size={16} style={{ color: 'var(--org-purple)' }} /> Team Distribution by Project</h3>
          </div>
          <div className="org-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {distribution.filter(d => d.totalAssigned > 0).map(d => (
              <div key={d.projectId} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid rgba(226,232,240,0.4)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#A78BFA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem', flexShrink: 0 }}>
                  {(d.projectName || 'P').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0 }}>{d.projectName}</p>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 700, background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: 6 }}>QA: {d.qaCount}</span>
                  <span style={{ color: '#6366F1', fontWeight: 700, background: 'rgba(99,102,241,0.08)', padding: '3px 8px', borderRadius: 6 }}>Dev: {d.devCount}</span>
                  {d.adminCount > 0 && <span style={{ color: '#F59E0B', fontWeight: 700, background: 'rgba(245,158,11,0.08)', padding: '3px 8px', borderRadius: 6 }}>Admin: {d.adminCount}</span>}
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#334155', minWidth: 30, textAlign: 'right' }}>{d.totalAssigned}</span>
              </div>
            ))}
            {distribution.every(d => d.totalAssigned === 0) && (
              <p style={{ textAlign: 'center', color: '#94A3B8', padding: '20px 0', fontSize: '0.85rem' }}>No team assignments across projects yet</p>
            )}
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input type="text" placeholder="Search team..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 42, paddingLeft: 42, border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.88rem', background: '#fff', outline: 'none' }} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.85rem', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Roles</option>
          <option value="OrgOwner">Org Owner</option>
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="QA">QA</option>
          <option value="Developer">Developer</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.85rem', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="org-card" style={{ padding: 0 }}>
        <table className="org-table">
          <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {loading ? [1, 2, 3].map(i => (
              <tr key={i}>{[1, 2, 3, 4].map(j => <td key={j}><div className="skeleton" style={{ height: 18, borderRadius: 4, width: 80 }} /></td>)}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                <UsersRound size={36} style={{ opacity: 0.25, marginBottom: 10 }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                  {members.length === 0 ? 'No members in this organization yet' : 'No members match your filters'}
                </p>
              </td></tr>
            ) : filtered.map(u => {
              const color = roleColors[u.role] || '#64748B';
              const RIcon = roleIcons[u.role] || Shield;
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        {(u.displayName || u.name || u.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0 }}>{u.displayName || u.name || 'Unnamed'}</p>
                        {u.designation && <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '1px 0 0' }}>{u.designation}</p>}
                      </div>
                    </div>
                  </td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.85rem' }}><Mail size={12} /> {u.email}</span></td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, background: `${color}12`, color, border: `1px solid ${color}20`, textTransform: 'uppercase' }}>
                      <RIcon size={10} /> {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`org-status-pill ${u.isActive === false ? 'org-status-inactive' : 'org-status-active'}`}>
                      {u.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.6)', borderTop: '1px solid rgba(226,232,240,0.6)', fontSize: '0.78rem', color: '#94A3B8', borderRadius: '0 0 18px 18px' }}>
          Showing {filtered.length} of {members.length} members
        </div>
      </div>
    </div>
  );
}
