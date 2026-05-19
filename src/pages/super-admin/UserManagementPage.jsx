import { useState, useEffect } from 'react';
import { 
  Users, Shield, ShieldCheck, Mail, Building2, UserMinus, UserCheck, 
  Trash2, RotateCcw, AlertTriangle, Search, Filter, RefreshCw, 
  FileText, Check, X, ShieldAlert, Clock, ArrowUpDown
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { 
  fetchAllUsersGlobal, 
  deactivateUser, 
  activateUser, 
  softDeleteUser, 
  restoreUser, 
  removeUserFromOrg, 
  deleteUser, 
  checkUserHasBugs, 
  checkUserHasProjects 
} from '../../services/teamService';
import { fetchAuditLogs } from '../../services/auditService';

export default function UserManagementPage() {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'deleted' | 'logs'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Audit reason dialog state
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(''); // 'SOFT_DELETE' | 'REMOVE_FROM_ORG' | 'DEACTIVATE' | 'ACTIVATE' | 'RESTORE' | 'PERMANENT_DELETE'
  const [actionReason, setActionReason] = useState('');
  const [isSubmitRunning, setIsSubmitRunning] = useState(false);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch organizations for mapping
      const orgSnap = await getDocs(collection(db, 'organizations'));
      const orgMap = {};
      orgSnap.docs.forEach(doc => {
        orgMap[doc.id] = doc.data().name || doc.id;
      });
      setOrganizations(orgMap);

      // 2. Fetch all users globally
      const globalUsers = await fetchAllUsersGlobal();
      
      // Deduplicate: if an active signed-up user exists for an email, exclude the pending invite placeholder
      const registeredEmails = new Set(
        globalUsers.filter(u => !u.invited).map(u => u.email?.toLowerCase()).filter(Boolean)
      );
      const deduplicatedUsers = globalUsers.filter(
        u => !u.invited || !registeredEmails.has(u.email?.toLowerCase())
      );

      setUsers(deduplicatedUsers);

      // 3. Fetch audit logs
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('[UserManagementPage] Data loading error:', err);
      toast.error('Failed to load global user management telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualSync = () => {
    loadData(true);
    toast.success('User control tables synchronized.');
  };

  // Toggle Sort order
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Trigger reason confirmation modal
  const triggerActionModal = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
    setActionReason('');
  };

  const cancelActionModal = () => {
    setSelectedUser(null);
    setActionType('');
    setActionReason('');
  };

  // Execute admin commands
  const handleExecuteAction = async () => {
    if (!selectedUser || !actionType) return;
    if (!actionReason.trim()) {
      return toast.error('An administrative justification/reason is required.');
    }

    const userId = selectedUser.id || selectedUser.uid;
    setIsSubmitRunning(true);

    try {
      switch (actionType) {
        case 'DEACTIVATE':
          await deactivateUser(userId, userProfile, actionReason);
          toast.success(`${selectedUser.name || selectedUser.displayName || selectedUser.email} has been deactivated.`);
          break;

        case 'ACTIVATE':
          await activateUser(userId, userProfile, actionReason);
          toast.success(`${selectedUser.name || selectedUser.displayName || selectedUser.email} has been activated.`);
          break;

        case 'SOFT_DELETE':
          await softDeleteUser(userId, userProfile, actionReason);
          toast.success(`${selectedUser.name || selectedUser.displayName || selectedUser.email} soft-deleted safely.`);
          break;

        case 'RESTORE':
          await restoreUser(userId, userProfile, actionReason);
          toast.success(`${selectedUser.name || selectedUser.displayName || selectedUser.email} restored successfully.`);
          break;

        case 'REMOVE_FROM_ORG':
          await removeUserFromOrg(userId, userProfile, actionReason);
          toast.success(`${selectedUser.name || selectedUser.displayName || selectedUser.email} removed from organization and archived.`);
          break;

        case 'PERMANENT_DELETE':
          // Run dependency check
          const hasBugs = await checkUserHasBugs(userId, selectedUser.uid);
          const hasProjects = await checkUserHasProjects(userId, selectedUser.uid);

          if (hasBugs || hasProjects) {
            const proceed = window.confirm(
              `WARNING: This user is assigned to active projects or bugs! Deleting them permanently may break query indexes or assignation histories. Proceed anyway?`
            );
            if (!proceed) {
              setIsSubmitRunning(false);
              return;
            }
          }

          await deleteUser(userId, userProfile, actionReason);
          toast.success(`${selectedUser.name || selectedUser.displayName || selectedUser.email} permanently purged from system.`);
          break;

        default:
          break;
      }
      
      cancelActionModal();
      await loadData(true);
    } catch (err) {
      console.error('[UserManagementPage] Action error:', err);
      toast.error(`Action failed: ${err.message || 'Permission denied'}`);
    } finally {
      setIsSubmitRunning(false);
    }
  };

  // Filter & Sort math
  const getFilteredUsers = () => {
    return users.filter(user => {
      // Tab isolation
      const isUserDeleted = user.isDeleted === true || user.is_deleted === true;
      const isArchived = user.removedFromOrg === true || user.removed_from_org === true;
      
      if (activeTab === 'all') {
        if (isUserDeleted || isArchived) return false;
      } else if (activeTab === 'deleted') {
        if (!isUserDeleted && !isArchived) return false;
      }

      // Search filters
      const matchesSearch = !searchQuery ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.uid?.toLowerCase().includes(searchQuery.toLowerCase());

      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Org filter
      const matchesOrg = orgFilter === 'all' || 
        (orgFilter === 'none' && !user.organizationId) || 
        user.organizationId === orgFilter;

      return matchesSearch && matchesRole && matchesOrg;
    }).sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredUsersList = getFilteredUsers();

  // Metrics computing
  const totalGlobalUsersCount = users.length;
  const activeGlobalUsersCount = users.filter(u => u.isActive !== false && u.isDeleted !== true && !u.removedFromOrg).length;
  const deletedArchivedUsersCount = users.filter(u => u.isDeleted === true || u.removedFromOrg === true).length;
  const totalAuditLogsCount = auditLogs.length;

  if (loading) {
    return (
      <div className="sa-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner spinner-lg" />
          <p style={{ marginTop: 16, color: 'var(--text-muted)', fontWeight: 500 }}>Initializing Security & User Roster control tables…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-container">
      {/* Page Header */}
      <header className="sa-header">
        <div className="sa-title-area">
          <h1 className="sa-title">
            <ShieldCheck size={24} style={{ color: 'var(--sa-rose)' }} />
            User Control & Security Panel
          </h1>
          <p className="sa-subtitle">Cross-tenant membership monitoring, soft-deletions, safety restores, and audit trail validation</p>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={handleManualSync}
          disabled={refreshing}
          style={{ height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={14} className={refreshing ? "spin" : ""} />
          Sync Roster
        </button>
      </header>

      {/* Metrics Section */}
      <section className="sa-grid-4">
        <div className="sa-card sa-card-indigo">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Total Registered</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--sa-indigo)' }}>
              <Users size={20} />
            </div>
          </div>
          <p className="sa-card-value">{totalGlobalUsersCount}</p>
          <div className="sa-card-footer">
            <span className="sa-trend-neutral">Global accounts roster</span>
          </div>
        </div>

        <div className="sa-card sa-card-emerald">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Active Members</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--sa-emerald)' }}>
              <UserCheck size={20} />
            </div>
          </div>
          <p className="sa-card-value">{activeGlobalUsersCount}</p>
          <div className="sa-card-footer">
            <span className="sa-trend-up">Access permissions online</span>
          </div>
        </div>

        <div className="sa-card sa-card-rose">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Archived / Deleted</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(244, 63, 94, 0.08)', color: 'var(--sa-rose)' }}>
              <Trash2 size={20} />
            </div>
          </div>
          <p className="sa-card-value">{deletedArchivedUsersCount}</p>
          <div className="sa-card-footer">
            <span className="sa-trend-neutral">Preserved histories & logs</span>
          </div>
        </div>

        <div className="sa-card sa-card-amber">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Security Audit Events</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--sa-amber)' }}>
              <FileText size={20} />
            </div>
          </div>
          <p className="sa-card-value">{totalAuditLogsCount}</p>
          <div className="sa-card-footer">
            <span className="sa-trend-up" style={{ color: 'var(--sa-amber)' }}>Persistent action ledger</span>
          </div>
        </div>
      </section>

      {/* Tab Switcher Grid */}
      <div className="sa-table-card sa-card">
        <div className="sa-table-header" style={{ flexWrap: 'wrap' }}>
          {/* Tabs Nav */}
          <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 4, borderRadius: 10 }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                border: 'none',
                background: activeTab === 'all' ? 'white' : 'transparent',
                color: activeTab === 'all' ? '#0F172A' : '#64748B',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              All Users
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              style={{
                border: 'none',
                background: activeTab === 'deleted' ? 'white' : 'transparent',
                color: activeTab === 'deleted' ? '#0F172A' : '#64748B',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: activeTab === 'deleted' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Archived & Soft-Deleted
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                border: 'none',
                background: activeTab === 'logs' ? 'white' : 'transparent',
                color: activeTab === 'logs' ? '#0F172A' : '#64748B',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: activeTab === 'logs' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Audit Activity Ledger
            </button>
          </div>

          {/* Tab Actions (Filters & Search) */}
          {activeTab !== 'logs' && (
            <div className="sa-table-actions" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search name, email, UID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 34px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: '0.825rem',
                    width: 200,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Organization Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} style={{ color: '#64748B' }} />
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: '0.825rem',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="all">All Companies</option>
                  <option value="none">Independent (No Tenant)</option>
                  {Object.entries(organizations).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={13} style={{ color: '#64748B' }} />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: '0.825rem',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admins</option>
                  <option value="org_admin">Org Admins</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Developer">Developers</option>
                  <option value="QA">QA Specialists</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs Content ── */}
        {activeTab !== 'logs' ? (
          <div className="sa-table-wrapper">
            {filteredUsersList.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                <Users size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontWeight: 600 }}>No users found matching the active filters.</p>
              </div>
            ) : (
              <table className="sa-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                      User Details <ArrowUpDown size={11} style={{ marginLeft: 4 }} />
                    </th>
                    <th>Email Address</th>
                    <th>Tenant Company</th>
                    <th>System Role</th>
                    <th style={{ textAlign: 'center' }}>Active Status</th>
                    <th style={{ textAlign: 'center' }}>Roster Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsersList.map((user) => {
                    const userId = user.id || user.uid;
                    const isUserActive = user.isActive !== false;
                    const isUserDeleted = user.isDeleted === true || user.is_deleted === true;
                    const isUserArchived = user.removedFromOrg === true || user.removed_from_org === true;
                    const friendlyOrg = user.organizationId ? (organizations[user.organizationId] || user.organizationId) : 'Independent (Archived)';
                    
                    return (
                      <tr key={userId} className="sa-row-hover">
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{user.name || user.displayName || (user.email ? user.email.split('@')[0] : 'Unnamed Account')}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>UID: {userId}</div>
                        </td>
                        <td>
                          <a href={`mailto:${user.email}`} style={{ color: 'var(--sa-indigo)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                            <Mail size={12} />
                            {user.email}
                          </a>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                            <Building2 size={13} style={{ color: '#94A3B8' }} />
                            {friendlyOrg}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: user.role === 'super_admin' || user.role === 'Superadmin' 
                              ? 'rgba(244, 63, 94, 0.1)' 
                              : user.role === 'org_admin' || user.role === 'Admin' || user.role === 'Manager'
                                ? 'rgba(99, 102, 241, 0.1)' 
                                : 'rgba(100, 116, 139, 0.1)',
                            color: user.role === 'super_admin' || user.role === 'Superadmin'
                              ? 'var(--sa-rose)'
                              : user.role === 'org_admin' || user.role === 'Admin' || user.role === 'Manager'
                                ? 'var(--sa-indigo)'
                                : '#475569'
                          }}>
                            {user.role || 'User'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`sa-status-pill ${isUserActive ? 'sa-status-active' : 'sa-status-suspended'}`}>
                            <span className="sa-pulse-dot" />
                            {isUserActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                            {activeTab === 'all' ? (
                              <>
                                {/* Status Toggle Button */}
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => triggerActionModal(user, isUserActive ? 'DEACTIVATE' : 'ACTIVATE')}
                                  title={isUserActive ? "Deactivate Account" : "Activate Account"}
                                  style={{ padding: 6, borderRadius: 8 }}
                                >
                                  {isUserActive ? <UserMinus size={14} style={{ color: 'var(--sa-amber)' }} /> : <UserCheck size={14} style={{ color: 'var(--sa-emerald)' }} />}
                                </button>

                                {/* Remove from Org / Archive */}
                                {user.organizationId && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => triggerActionModal(user, 'REMOVE_FROM_ORG')}
                                    title="Remove from Org (Archive)"
                                    style={{ padding: 6, borderRadius: 8 }}
                                  >
                                    <Building2 size={14} style={{ color: '#E11D48' }} />
                                  </button>
                                )}

                                {/* Soft Delete */}
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => triggerActionModal(user, 'SOFT_DELETE')}
                                  title="Soft-Delete Member"
                                  style={{ padding: 6, borderRadius: 8 }}
                                >
                                  <Trash2 size={14} style={{ color: 'var(--sa-rose)' }} />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Restore User */}
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => triggerActionModal(user, 'RESTORE')}
                                  title="Restore Member"
                                  style={{ padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--sa-emerald)' }}
                                >
                                  <RotateCcw size={13} />
                                  Restore
                                </button>

                                {/* Permanent Hard Delete */}
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => triggerActionModal(user, 'PERMANENT_DELETE')}
                                  title="Permanently Purge from DB"
                                  style={{ padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--sa-rose)' }}
                                >
                                  <ShieldAlert size={13} />
                                  Purge
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* ── AUDIT LOGS TAB ── */
          <div className="sa-table-wrapper">
            {auditLogs.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
                <FileText size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontWeight: 600 }}>No security audit trail exists in the database.</p>
              </div>
            ) : (
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Actor (Admin)</th>
                    <th>Audit Action</th>
                    <th>Target User</th>
                    <th>Justification / Reason</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    const date = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
                    const formattedDate = isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });

                    return (
                      <tr key={log.id} className="sa-row-hover">
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{log.actor?.name || 'System'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{log.actor?.email}</div>
                          <div style={{ fontSize: '0.65rem', background: '#F1F5F9', color: '#475569', display: 'inline-block', padding: '2px 6px', borderRadius: 4, marginTop: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                            {log.actor?.role}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: 999,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: log.action === 'PERMANENT_DELETE' 
                              ? 'rgba(239, 68, 68, 0.15)' 
                              : log.action === 'SOFT_DELETE' || log.action === 'REMOVE_FROM_ORG'
                                ? 'rgba(244, 63, 94, 0.1)'
                                : log.action === 'RESTORE' || log.action === 'ACTIVATE'
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : 'rgba(245, 158, 11, 0.1)',
                            color: log.action === 'PERMANENT_DELETE' 
                              ? '#EF4444' 
                              : log.action === 'SOFT_DELETE' || log.action === 'REMOVE_FROM_ORG'
                                ? 'var(--sa-rose)'
                                : log.action === 'RESTORE' || log.action === 'ACTIVATE'
                                  ? '#059669'
                                  : '#D97706'
                          }}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{log.targetUser?.name || 'Account'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{log.targetUser?.email}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: 'monospace' }}>Target UID: {log.targetUser?.uid?.slice(0, 8)}…</div>
                        </td>
                        <td style={{ maxWidth: 280, lineBreak: 'anywhere' }}>
                          <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#334155', fontWeight: 500 }}>
                            "{log.reason}"
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} />
                            {formattedDate}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Administrative Justification/Reason Modal ── */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'saFadeIn 0.2s ease-out'
        }}>
          <div className="sa-card" style={{ width: '100%', maxWidth: 500, margin: 20, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} style={{ color: actionType === 'PERMANENT_DELETE' ? 'var(--sa-rose)' : 'var(--sa-amber)' }} />
                  Security Authorization Required
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  State the administrative reason/justification for this action.
                </p>
              </div>
              <button 
                onClick={cancelActionModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 14, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>TARGET MEMBER:</div>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem', marginTop: 2 }}>
                {selectedUser.name || selectedUser.displayName || (selectedUser.email ? selectedUser.email.split('@')[0] : 'Unnamed Account')} ({selectedUser.email})
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: 8 }}>COMMAND EVENT:</div>
              <div style={{ 
                fontWeight: 700, 
                color: actionType === 'PERMANENT_DELETE' ? '#EF4444' : 'var(--sa-indigo)', 
                fontSize: '0.85rem', 
                textTransform: 'uppercase',
                marginTop: 2 
              }}>
                {actionType?.replace(/_/g, ' ')}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <label htmlFor="actionReason" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Reason / Justification <span style={{ color: 'var(--sa-rose)' }}>*</span>
              </label>
              <textarea
                id="actionReason"
                placeholder="e.g. Inactive developer offboarded, security compliance request, database cleanup, etc."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  fontSize: '0.825rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={cancelActionModal}
                disabled={isSubmitRunning}
                style={{ padding: '8px 16px', borderRadius: 10 }}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleExecuteAction}
                disabled={isSubmitRunning}
                style={{
                  background: actionType === 'PERMANENT_DELETE' ? '#EF4444' : 'var(--sa-rose)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isSubmitRunning ? 'Executing...' : 'Authorize Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
