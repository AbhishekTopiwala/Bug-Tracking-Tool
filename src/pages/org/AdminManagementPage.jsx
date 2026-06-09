import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Search, MoreVertical, Mail, Shield,
  UserX, UserCheck, Trash2, X, Edit3, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrgTeamMembers, inviteAdmin, updateAdmin,
  deactivateAdmin, activateAdmin, removeAdmin, subscribeToOrgData,
} from '../../services/orgService';
import toast from 'react-hot-toast';

export default function AdminManagementPage() {
  const { currentUser, userProfile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    name: '', email: '', designation: '', department: '', permissionLevel: 'full'
  });
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    try {
      const data = await getOrgTeamMembers(userProfile.organizationId);
      setMembers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    loadMembers();
    // Real-time updates
    const unsub = subscribeToOrgData(userProfile.organizationId, () => loadMembers());
    return () => unsub();
  }, [userProfile?.organizationId, loadMembers]);

  // Close action menu on outside click
  useEffect(() => {
    const handler = () => setActionMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const admins = members.filter(u => ['Admin', 'Manager', 'org_admin', 'OrgOwner'].includes(u.role));
  const filtered = admins.filter(u => {
    const matchSearch = !search || (u.displayName || u.name || u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'active' && u.isActive !== false && !u.invited)
      || (filterStatus === 'inactive' && u.isActive === false)
      || (filterStatus === 'pending' && u.invited);
    return matchSearch && matchRole && matchStatus;
  });

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) { toast.error('Name and email are required'); return; }
    setInviting(true);
    try {
      const result = await inviteAdmin({
        ...inviteForm,
        invitedBy: currentUser?.displayName || 'Organization Owner',
        invitedByEmail: currentUser?.email || '',
        orgId: userProfile?.organizationId,
      });
      
      if (result.emailSent) {
        toast.success(`Invitation sent to ${inviteForm.email}`);
      } else {
        toast.success(`Admin added. (Email bypassed - config missing)`);
      }
      
      setShowInviteModal(false);
      setInviteForm({ name: '', email: '', designation: '', department: '', permissionLevel: 'full' });
      await loadMembers();
    } catch (e) {
      toast.error(e.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivate = async (userId) => {
    try {
      await deactivateAdmin(userId, { displayName: currentUser?.displayName, email: currentUser?.email });
      toast.success('Admin deactivated');
      setActionMenu(null);
      await loadMembers();
    } catch (e) { toast.error('Failed to deactivate'); }
  };

  const handleActivate = async (userId) => {
    try {
      await activateAdmin(userId, { displayName: currentUser?.displayName, email: currentUser?.email });
      toast.success('Admin activated');
      setActionMenu(null);
      await loadMembers();
    } catch (e) { toast.error('Failed to activate'); }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this admin from the organization?')) return;
    try {
      await removeAdmin(userId, { displayName: currentUser?.displayName, email: currentUser?.email, uid: currentUser?.uid });
      toast.success('Admin removed from organization');
      setActionMenu(null);
      await loadMembers();
    } catch (e) { toast.error('Failed to remove'); }
  };

  const roleColors = {
    Admin: '#F59E0B', Manager: '#3B82F6', org_admin: '#7C3AED', OrgOwner: '#7C3AED',
  };

  return (
    <div className="org-container">
      {/* ── Header ── */}
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title">
            <Users size={24} style={{ color: 'var(--org-purple)' }} />
            Admin Management
          </h1>
          <p className="org-page-subtitle">
            Manage administrators and project managers in your organization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="org-btn-secondary" onClick={loadMembers} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="org-btn-primary" onClick={() => setShowInviteModal(true)}>
            <UserPlus size={16} /> Invite Admin
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Admins', value: admins.length, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
          { label: 'Active', value: admins.filter(u => u.isActive !== false && !u.invited).length, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Inactive', value: admins.filter(u => u.isActive === false).length, color: '#F43F5E', bg: 'rgba(244,63,94,0.08)' },
          { label: 'Pending Invite', value: admins.filter(u => u.invited).length, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="org-stat-card" style={{ padding: 18 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', margin: '0 0 8px' }}>{label}</p>
            {loading
              ? <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 4 }} />
              : <p style={{ fontSize: '1.5rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
            }
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 42, paddingLeft: 42, paddingRight: 16,
              border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10,
              fontSize: '0.88rem', background: '#fff', outline: 'none',
            }}
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{
            height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)',
            borderRadius: 10, fontSize: '0.85rem', background: '#fff', color: '#334155',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">All Roles</option>
          <option value="OrgOwner">Org Owner</option>
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)',
            borderRadius: 10, fontSize: '0.85rem', background: '#fff', color: '#334155',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending Invite</option>
        </select>
      </div>

      {/* ── Admins Table ── */}
      <div className="org-card" style={{ padding: 0, overflow: 'visible' }}>
        <table className="org-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th style={{ width: 60 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <td key={j}><div className="skeleton" style={{ height: 18, borderRadius: 4, width: j === 1 ? 140 : 80 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                  <Users size={36} style={{ opacity: 0.25, marginBottom: 10 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>No admins found</p>
                  <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>Try adjusting your filters or invite a new admin.</p>
                </td>
              </tr>
            ) : (
              filtered.map(user => {
                const initials = (user.displayName || user.name || user.email || '?').slice(0, 2).toUpperCase();
                const isCurrentUser = user.id === currentUser?.uid || user.uid === currentUser?.uid;
                const color = roleColors[user.role] || '#64748B';
                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, background: `${color}15`, color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.8rem', flexShrink: 0
                        }}>{initials}</div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', margin: 0 }}>
                            {user.displayName || user.name || 'Unnamed'}
                            {isCurrentUser && (
                              <span style={{ marginLeft: 6, fontSize: '0.65rem', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>You</span>
                            )}
                          </p>
                          {user.designation && (
                            <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '1px 0 0' }}>{user.designation}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.85rem' }}>
                        <Mail size={13} /> {user.email}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 8, fontSize: '0.72rem',
                        fontWeight: 700, textTransform: 'uppercase',
                        background: `${color}12`, color, border: `1px solid ${color}20`
                      }}>
                        <Shield size={10} /> {user.role}
                      </span>
                    </td>
                    <td style={{ color: '#64748B', fontSize: '0.85rem' }}>
                      {user.department || '—'}
                    </td>
                    <td>
                      {user.invited ? (
                        <span className="org-status-pill org-status-invited">Pending</span>
                      ) : user.isActive === false ? (
                        <span className="org-status-pill org-status-inactive">Inactive</span>
                      ) : (
                        <span className="org-status-pill org-status-active">Active</span>
                      )}
                    </td>
                    <td>
                      {!isCurrentUser && (
                        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                            style={{
                              width: 32, height: 32, borderRadius: 8, display: 'flex',
                              alignItems: 'center', justifyContent: 'center', color: '#94A3B8',
                              background: 'transparent', border: '1px solid transparent',
                              cursor: 'pointer', transition: 'all 0.2s',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {actionMenu === user.id && (
                            <div style={{
                              position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 180,
                              background: '#fff', border: '1px solid rgba(226,232,240,0.9)',
                              borderRadius: 12, boxShadow: '0 10px 25px rgba(15,23,42,0.1)',
                              zIndex: 99, padding: 6,
                            }}>
                              {user.isActive !== false ? (
                                <button onClick={() => handleDeactivate(user.id)} style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
                                  fontWeight: 600, color: '#F59E0B', background: 'transparent',
                                  border: 'none', cursor: 'pointer', textAlign: 'left',
                                }}>
                                  <UserX size={14} /> Deactivate
                                </button>
                              ) : (
                                <button onClick={() => handleActivate(user.id)} style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
                                  fontWeight: 600, color: '#10B981', background: 'transparent',
                                  border: 'none', cursor: 'pointer', textAlign: 'left',
                                }}>
                                  <UserCheck size={14} /> Activate
                                </button>
                              )}
                              <button onClick={() => handleRemove(user.id)} style={{
                                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem',
                                fontWeight: 600, color: '#EF4444', background: 'transparent',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                              }}>
                                <Trash2 size={14} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div style={{
          padding: '12px 20px', background: 'rgba(248,250,252,0.6)',
          borderTop: '1px solid rgba(226,232,240,0.6)', fontSize: '0.78rem',
          color: '#94A3B8', borderRadius: '0 0 18px 18px'
        }}>
          Showing {filtered.length} of {admins.length} administrators
        </div>
      </div>

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div className="org-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="org-modal" onClick={e => e.stopPropagation()}>
            <div className="org-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={18} style={{ color: 'var(--org-purple)' }} /> Invite Admin
              </h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>
            <div className="org-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Full Name', key: 'name', placeholder: 'John Doe', required: true },
                { label: 'Email Address', key: 'email', placeholder: 'john@company.com', type: 'email', required: true },
                { label: 'Designation', key: 'designation', placeholder: 'Project Manager' },
                { label: 'Department', key: 'department', placeholder: 'Engineering' },
              ].map(({ label, key, placeholder, type, required }) => (
                <div key={key}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
                  </label>
                  <input
                    type={type || 'text'}
                    placeholder={placeholder}
                    value={inviteForm[key]}
                    onChange={e => setInviteForm({ ...inviteForm, [key]: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.8)',
                      borderRadius: 10, fontSize: '0.88rem', outline: 'none', background: '#FAFBFC',
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Permission Level
                </label>
                <select
                  value={inviteForm.permissionLevel}
                  onChange={e => setInviteForm({ ...inviteForm, permissionLevel: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.8)',
                    borderRadius: 10, fontSize: '0.88rem', background: '#FAFBFC', cursor: 'pointer',
                  }}
                >
                  <option value="full">Full Access</option>
                  <option value="limited">Limited Access</option>
                  <option value="view_only">View Only</option>
                </select>
              </div>
            </div>
            <div className="org-modal-footer">
              <button className="org-btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button className="org-btn-primary" onClick={handleInvite} disabled={inviting}>
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
