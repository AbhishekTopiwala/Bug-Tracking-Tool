import { useState, useEffect } from 'react';
import { UsersRound, Search, Code2, TestTube2, Crown, Shield, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgTeamMembers, getTeamDistribution } from '../../services/orgService';

export default function TeamVisibilityPage() {
  const { userProfile } = useAuth();
  const [members, setMembers] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [m, d] = await Promise.all([
          getOrgTeamMembers(userProfile?.organizationId),
          getTeamDistribution(userProfile?.organizationId),
        ]);
        setMembers(m);
        setDistribution(d);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (userProfile?.organizationId) load();
  }, [userProfile?.organizationId]);

  const active = members.filter(u => u.isActive !== false);
  const inactive = members.filter(u => u.isActive === false);

  const filtered = members.filter(u => {
    const matchSearch = !search || (u.displayName || u.name || u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleColors = { Admin: '#F59E0B', Manager: '#3B82F6', OrgOwner: '#7C3AED', QA: '#10B981', Developer: '#6366F1' };
  const roleIcons = { Admin: Crown, Manager: Crown, OrgOwner: Shield, QA: TestTube2, Developer: Code2 };

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><UsersRound size={24} style={{ color: 'var(--org-purple)' }} /> Team Visibility</h1>
          <p className="org-page-subtitle">View all QAs, Developers, and team distribution across projects.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Members', value: members.length, color: '#7C3AED' },
          { label: 'Active', value: active.length, color: '#10B981' },
          { label: 'Inactive', value: inactive.length, color: '#F43F5E' },
          { label: 'Roles', value: [...new Set(members.map(m => m.role))].length, color: '#3B82F6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="org-stat-card" style={{ padding: 18 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', margin: '0 0 8px' }}>{label}</p>
            {loading ? <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 4 }} />
              : <p style={{ fontSize: '1.5rem', fontWeight: 800, color, margin: 0 }}>{value}</p>}
          </div>
        ))}
      </div>

      {/* Team Distribution per Project */}
      {distribution.length > 0 && (
        <div className="org-card">
          <div className="org-card-header">
            <h3 className="org-card-title"><UsersRound size={16} style={{ color: 'var(--org-purple)' }} /> Team Distribution by Project</h3>
          </div>
          <div className="org-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {distribution.map(d => (
              <div key={d.projectId} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(226,232,240,0.4)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#A78BFA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem', flexShrink: 0 }}>
                  {(d.projectName || 'P').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0 }}>{d.projectName}</p>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>QA: {d.qaCount}</span>
                  <span style={{ color: '#6366F1', fontWeight: 700 }}>Dev: {d.devCount}</span>
                  <span style={{ color: '#F59E0B', fontWeight: 700 }}>Admin: {d.adminCount}</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#334155' }}>{d.totalAssigned}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
          <option value="QA">QA</option>
          <option value="Developer">Developer</option>
        </select>
      </div>

      <div className="org-card" style={{ padding: 0 }}>
        <table className="org-table">
          <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {loading ? [1, 2, 3].map(i => (
              <tr key={i}>{[1, 2, 3, 4].map(j => <td key={j}><div className="skeleton" style={{ height: 18, borderRadius: 4, width: 80 }} /></td>)}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>No members found</td></tr>
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
                      <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0 }}>{u.displayName || u.name || 'Unnamed'}</p>
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
      </div>
    </div>
  );
}
