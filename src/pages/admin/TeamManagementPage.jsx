import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Code2, TestTube2,
  Mail, Trash2, X, Search, AlertTriangle,
  Check, Crown, Folder, LayoutGrid, List, RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminTopbar from '../../components/AdminTopbar';
import {
  fetchAllUsers,
  updateUserRole,
  deactivateUser,
  activateUser,
  inviteUser,
} from '../../services/teamService';
import { getProjects } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES = ['QA', 'Developer', 'Admin'];

const ROLE_META = {
  Admin: { label: 'Admin', icon: Crown, cls: 'role-badge--admin' },
  Developer: { label: 'Developer', icon: Code2, cls: 'role-badge--developer' },
  QA: { label: 'QA', icon: TestTube2, cls: 'role-badge--qa' },
};

function getInitials(name = '', email = '') {
  const source = name || email || '?';
  return source
    .split(/[ @]/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.QA;
  const Icon = meta.icon;
  return (
    <span className={`role-badge ${meta.cls}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

// ─── Deactivate Toggle Switch ─────────────────────────────────────────────────

function ActiveToggle({ user, onToggle }) {
  const [busy, setBusy] = useState(false);
  const isActive = user.isActive !== false;

  const handleChange = async (e) => {
    // Prevent accidental double-clicks or bubbling
    e.preventDefault();
    if (busy) return;
    
    setBusy(true);
    try {
      await onToggle(user, isActive);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="tm-toggle"
      title={busy ? 'Saving…' : isActive ? 'Click to deactivate' : 'Click to activate'}
      onClick={handleChange}
      style={{ 
        opacity: busy ? 0.6 : 1,
        cursor: busy ? 'not-allowed' : 'pointer'
      }}
    >
      <input
        type="checkbox"
        checked={isActive}
        readOnly
        style={{ 
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0
        }}
      />
      <span className={`tm-toggle-track ${isActive ? 'tm-toggle-track--on' : ''}`}>
        <span className="tm-toggle-thumb" />
      </span>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('QA');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email is required');
    setLoading(true);
    try {
      await inviteUser({ email: email.trim(), name: name.trim() || email.split('@')[0], role });
      toast.success(`Invite sent to ${email}!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal tm-invite-modal animate-slide">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="tm-invite-icon">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Invite Team Member</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                They'll receive an email invitation
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Assign Role</label>
              <div className="tm-role-picker">
                {ROLES.map((r) => {
                  const meta = ROLE_META[r];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={r}
                      type="button"
                      className={`tm-role-option ${role === r ? 'tm-role-option--selected' : ''}`}
                      onClick={() => setRole(r)}
                    >
                      <Icon size={16} />
                      <span>{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</>
              ) : (
                <><UserPlus size={14} /> Send Invite</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── Member Row (shared) ──────────────────────────────────────────────────────

function MemberRow({ user, onToggle }) {
  const isActive = user.isActive !== false;
  return (
    <tr className={`tm-table-row${isActive ? '' : ' tm-row-inactive'}`}>
      <td>
        <div className="tm-member-cell">
          <div className="tm-avatar">
            {user.photoURL
              ? <img src={user.photoURL} alt={user.name} />
              : <span>{getInitials(user.name, user.email)}</span>
            }
          </div>
          <div>
            <p className="tm-member-name">
              {user.name || (user.email ? user.email.split('@')[0] : '—')}
            </p>
            <p className="tm-member-uid">UID: {user.uid?.slice(0, 8)}…</p>
          </div>
        </div>
      </td>
      <td>
        <a href={`mailto:${user.email}`} className="tm-email-link">
          <Mail size={13} />
          {user.email}
        </a>
      </td>
      <td><RoleBadge role={user.role} /></td>
      <td className="tm-date-cell">
        {user.createdAt?.seconds
          ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
          : '—'}
      </td>
      <td style={{ textAlign: 'center' }}>
        <ActiveToggle user={user} onToggle={onToggle} />
      </td>
    </tr>
  );
}

// ─── Project Team Group Card ──────────────────────────────────────────────────

function ProjectGroupCard({ project, members, onToggle }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="tm-project-group">
      <div
        className="tm-project-group-header"
        onClick={() => setCollapsed(c => !c)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="tm-project-icon">
            <Folder size={16} />
          </div>
          <div>
            <p className="tm-project-name">{project.name}</p>
            {project.description && (
              <p className="tm-project-desc">{project.description}</p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="tm-member-count-badge">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
          <span style={{
            color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600,
            transition: 'transform 0.2s',
            display: 'inline-block',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
          }}>▼</span>
        </div>
      </div>

      {!collapsed && (
        members.length === 0 ? (
          <div className="tm-project-empty">
            <Users size={20} />
            <span>No members assigned to this project</span>
          </div>
        ) : (
          <div className="tm-table-scroll">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'center' }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {members.map(user => (
                  <MemberRow
                    key={user.id}
                    user={user}
                    onToggle={onToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamManagementPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [showInvite, setShowInvite] = useState(false);
  // 'all' | 'project'
  const [viewMode, setViewMode] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, projectData] = await Promise.all([
        fetchAllUsers(),
        getProjects(null, 'Admin'),
      ]);
      setUsers(userData);
      setProjects(projectData);
    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Filtered list (All Members view) — show ALL users including inactive ──
  const filtered = users.filter((u) => {
    const matchRole = filterRole === 'All' || u.role === filterRole;
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  // ── Project-grouped data (only active in project view) ──
  const projectGroups = projects.map(project => {
    const assigned = (project.assignedUsers || []);
    const members = users.filter(u => {
      const uid = u.uid || u.id;
      if (!assigned.includes(uid)) return false;
      const matchSearch = !search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'All' || u.role === filterRole;
      return matchSearch && matchRole;
    });
    return { project, members };
  });

  // ── Toggle active/inactive ──
  const handleToggle = async (user, currentlyActive) => {
    const targetId = user.id || user.uid;
    console.log('[TeamManagement] Toggle requested for:', {
      email: user.email,
      id: user.id,
      uid: user.uid,
      targetId,
      currentlyActive
    });
    
    if (!targetId) {
      console.error('[TeamManagement] No valid ID found for user:', user);
      return toast.error("Cannot update user: Missing unique identifier.");
    }

    // 1. Self-protection
    if (targetId === currentUser?.uid) {
      return toast.error("You cannot deactivate your own account.");
    }

    try {
      // 2. Perform update
      if (currentlyActive) {
        await deactivateUser(targetId);
        setUsers(prev => prev.map(u => (u.id === targetId || u.uid === targetId) ? { ...u, isActive: false } : u));
        toast.success(`${user.name || user.email} has been deactivated.`);
      } else {
        await activateUser(targetId);
        setUsers(prev => prev.map(u => (u.id === targetId || u.uid === targetId) ? { ...u, isActive: true } : u));
        toast.success(`${user.name || user.email} has been activated.`);
      }
    } catch (err) {
      console.error('[TeamManagement] Toggle error:', err);
      toast.error(`Failed to update status: ${err.message || 'Permission denied'}`);
    }
  };

  // ── Stats (active only for counts) ──
  const activeUsers = users.filter(u => u.isActive !== false);
  const total = activeUsers.length;
  const admins = activeUsers.filter((u) => u.role === 'Admin').length;
  const devs = activeUsers.filter((u) => u.role === 'Developer').length;
  const qas = activeUsers.filter((u) => u.role === 'QA').length;

  return (
    <>
      <AdminTopbar
        title="Team Management"
        subtitle="Manage your team members, roles, and access."
      />
      <div className="page-container">

        {/* Top actions row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          {/* View toggle */}
          <div className="tm-view-toggle">
            <button
              id="view-all-members"
              className={`tm-view-btn ${viewMode === 'all' ? 'tm-view-btn--active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              <List size={15} />
              All Members
            </button>
            <button
              id="view-by-project"
              className={`tm-view-btn ${viewMode === 'project' ? 'tm-view-btn--active' : ''}`}
              onClick={() => setViewMode('project')}
            >
              <LayoutGrid size={15} />
              By Project
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="admin-stats-grid tm-stats-grid">
          {[
            { label: 'Total Members', value: total, icon: Users, color: 'var(--admin-accent)' },
            { label: 'Admins', value: admins, icon: Crown, color: '#5B6CFF' },
            { label: 'Developers', value: devs, icon: Code2, color: 'var(--info)' },
            { label: 'QA Engineers', value: qas, icon: TestTube2, color: 'var(--success)' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="admin-stat-card">
              <div className="admin-stat-icon-wrap" style={{ background: `${color}15`, color }}>
                <Icon size={20} />
              </div>
              <div className="admin-stat-info">
                <p className="admin-stat-value">{value}</p>
                <p className="admin-stat-label">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="tm-toolbar">
          <div className="search-wrapper tm-search">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-bar">
            {['All', ...ROLES].map((r) => (
              <button
                key={r}
                className={`filter-chip ${filterRole === r ? 'active' : ''}`}
                onClick={() => setFilterRole(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* ── ALL MEMBERS VIEW ── */}
        {viewMode === 'all' && (
          <div className="tm-table-wrap card">
            {loading ? (
              <div className="tm-table-loading">
                <span className="spinner spinner-lg" />
                <p>Loading team members…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h3>No members found</h3>
                <p>Try adjusting your search or invite someone new.</p>
              </div>
            ) : (
              <div className="tm-table-scroll">
                <table className="tm-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th style={{ textAlign: 'center' }}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <MemberRow
                        key={user.id}
                        user={user}
                        onToggle={handleToggle}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (
              <div className="tm-table-footer">
                Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> members
              </div>
            )}
          </div>
        )}

        {/* ── PROJECT VIEW ── */}
        {viewMode === 'project' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {loading ? (
              <div className="tm-table-wrap card">
                <div className="tm-table-loading">
                  <span className="spinner spinner-lg" />
                  <p>Loading projects…</p>
                </div>
              </div>
            ) : projectGroups.length === 0 ? (
              <div className="tm-table-wrap card">
                <div className="empty-state">
                  <Folder size={48} />
                  <h3>No projects found</h3>
                  <p>Create a project first to see team assignments here.</p>
                </div>
              </div>
            ) : (
              <>
                {projectGroups.map(({ project, members }) => (
                  <ProjectGroupCard
                    key={project.id}
                    project={project}
                    members={members}
                    onToggle={handleToggle}
                  />
                ))}
                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)', paddingRight: 4 }}>
                  {projects.length} project{projects.length !== 1 ? 's' : ''} · {total} active member{total !== 1 ? 's' : ''}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Invite Modal ── */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={loadData}
        />
      )}
    </>
  );
}
