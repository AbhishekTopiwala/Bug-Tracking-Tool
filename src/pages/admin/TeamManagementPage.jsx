import { useState, useEffect, useRef } from 'react';
import {
  Users, UserPlus, MoreVertical, Code2, TestTube2,
  Mail, Trash2, RefreshCw, X, Search, AlertTriangle,
  Check, Crown,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminTopbar from '../../components/AdminTopbar';
import {
  fetchAllUsers,
  updateUserRole,
  deactivateUser,
  inviteUser,
} from '../../services/teamService';

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

// ─── Actions Dropdown ─────────────────────────────────────────────────────────

function ActionsMenu({ user, onRoleChange, onDeactivate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="tm-actions-wrap" ref={ref}>
      <button
        className="tm-actions-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="User actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="tm-actions-menu animate-fade">
          <p className="tm-actions-label">Change Role</p>
          {ROLES.map((r) => (
            <button
              key={r}
              className={`tm-action-item ${user.role === r ? 'tm-action-item--active' : ''} tm-action-item--${r.toLowerCase()}`}
              onClick={() => { onRoleChange(user, r); setOpen(false); }}
            >
              {ROLE_META[r] && (() => { const Icon = ROLE_META[r].icon; return <Icon size={14} />; })()}
              <span>{r}</span>
              {user.role === r && <Check size={14} className="tm-action-check" />}
            </button>
          ))}
          <div className="tm-actions-divider" />
          <button
            className="tm-action-item tm-action-item--danger"
            onClick={() => { onDeactivate(user); setOpen(false); }}
          >
            <Trash2 size={13} />
            Deactivate User
          </button>
        </div>
      )}
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
        {/* Header */}
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

        {/* Body */}
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

// ─── Confirm Deactivate Modal ─────────────────────────────────────────────────

function ConfirmModal({ user, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="tm-danger-icon">
              <AlertTriangle size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Deactivate User</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{user?.name || user?.email}</strong>?
            They will lose access immediately. This action can be reversed by re-inviting them.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Trash2 size={14} />}
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [showInvite, setShowInvite] = useState(false);
  const [confirmUser, setConfirmUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Filtered list ──
  const filtered = users.filter((u) => {
    const matchRole = filterRole === 'All' || u.role === filterRole;
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch && u.isActive !== false;
  });

  // ── Handlers ──
  const handleRoleChange = async (user, newRole) => {
    if (user.role === newRole) return;
    try {
      await updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`${user.name || user.email}'s role updated to ${newRole}`);
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleDeactivate = async () => {
    if (!confirmUser) return;
    setActionLoading(true);
    try {
      await deactivateUser(confirmUser.id);
      setUsers((prev) => prev.map((u) => u.id === confirmUser.id ? { ...u, isActive: false } : u));
      toast.success(`${confirmUser.name || confirmUser.email} has been deactivated`);
      setConfirmUser(null);
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Stats ──
  const total = users.filter((u) => u.isActive !== false).length;
  const admins = users.filter((u) => u.role === 'Admin' && u.isActive !== false).length;
  const devs = users.filter((u) => u.role === 'Developer' && u.isActive !== false).length;
  const qas = users.filter((u) => u.role === 'QA' && u.isActive !== false).length;

  return (
    <>
      <AdminTopbar title="Team" />
      <div className="page-container">

        {/* ── Header ── */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Team Management</h1>
            <p className="page-subtitle">Manage your team members, roles, and access.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>

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

          <button className="btn btn-secondary btn-sm" onClick={loadUsers} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* ── Table ── */}
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
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="tm-table-row">
                      {/* Avatar + Name */}
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

                      {/* Email */}
                      <td>
                        <a href={`mailto:${user.email}`} className="tm-email-link">
                          <Mail size={13} />
                          {user.email}
                        </a>
                      </td>

                      {/* Role Badge */}
                      <td><RoleBadge role={user.role} /></td>

                      {/* Joined date */}
                      <td className="tm-date-cell">
                        {user.createdAt?.seconds
                          ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <ActionsMenu
                          user={user}
                          onRoleChange={handleRoleChange}
                          onDeactivate={setConfirmUser}
                        />
                      </td>
                    </tr>
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
      </div>

      {/* ── Invite Modal ── */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={loadUsers}
        />
      )}

      {/* ── Confirm Deactivate Modal ── */}
      {confirmUser && (
        <ConfirmModal
          user={confirmUser}
          onClose={() => setConfirmUser(null)}
          onConfirm={handleDeactivate}
          loading={actionLoading}
        />
      )}
    </>
  );
}
