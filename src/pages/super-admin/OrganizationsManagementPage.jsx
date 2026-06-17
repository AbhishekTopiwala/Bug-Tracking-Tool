import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Search, MoreVertical, Edit2, Trash2, 
  ShieldOff, CheckCircle, ChevronDown, ChevronUp, Filter,
  TrendingUp, Users, BrainCircuit, Layers, Clock, Mail, Info, ArrowUpDown, ShieldCheck, X
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../../components/Skeleton';

export default function OrganizationsManagementPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Filters & Sorting
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt'); // name, createdAt, plan, status
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  
  // Drawer & Pagination
  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Details Modal
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, type: '', orgId: '', orgName: '', data: [], loading: false });

  const openDetailsModal = async (type, orgId, orgName) => {
    setDetailsModal({ isOpen: true, type, orgId, orgName, data: [], loading: true });
    try {
      if (type === 'members') {
        const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
        const usersSnap = await getDocs(q);
        const activeUsers = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.isActive !== false);
        setDetailsModal({ isOpen: true, type, orgId, orgName, data: activeUsers, loading: false });
      } else if (type === 'projects') {
        const q = query(collection(db, 'projects'), where('organizationId', '==', orgId));
        const projectsSnap = await getDocs(q);
        const orgProjects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDetailsModal({ isOpen: true, type, orgId, orgName, data: orgProjects, loading: false });
      }
    } catch (err) {
      console.error(`Failed to load ${type}:`, err);
      toast.error(`Failed to load ${type}`);
      setDetailsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const closeDetailsModal = () => {
    setDetailsModal({ isOpen: false, type: '', orgId: '', orgName: '', data: [], loading: false });
  };

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'organizations'));
      const projectsSnap = await getDocs(collection(db, 'projects'));
      const usersSnap = await getDocs(collection(db, 'users'));

      const allProjects = projectsSnap.docs.map(d => d.data());
      const allUsers = usersSnap.docs.map(d => d.data());

      const orgs = snap.docs.map(d => {
        const orgId = d.id;
        const orgData = d.data();

        // Calculate actual projects count for this organization
        const projectsCount = allProjects.filter(p => p.organizationId === orgId).length;

        // Calculate actual active members count for this organization
        const membersCount = allUsers.filter(u => u.organizationId === orgId && u.isActive !== false).length;

        return {
          id: orgId,
          ...orgData,
          projectsCount,
          membersCount
        };
      });

      setOrganizations(orgs);
    } catch (err) {
      console.error('Failed to load organizations:', err);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleSuspend = async (orgId, currentStatus, e) => {
    e.stopPropagation(); // Prevent drawer toggle
    const isCurrentlySuspended = (currentStatus || '').toLowerCase() === 'suspended';
    const newStatus = isCurrentlySuspended ? 'ACTIVE' : 'SUSPENDED';
    
    let msg = `Are you sure you want to ${isCurrentlySuspended ? 'activate' : 'suspend'} this organization?`;
    if (import.meta.env.VITE_APP_ENV === 'production') {
      msg = `🚨 [PRODUCTION ENVIRONMENT] 🚨\n\nYou are mutating real data. Are you absolutely sure you want to ${isCurrentlySuspended ? 'activate' : 'suspend'} this organization?`;
    }
    
    if (!window.confirm(msg)) return;
    
    try {
      await updateDoc(doc(db, 'organizations', orgId), { 'subscription.status': newStatus });
      setOrganizations(orgs => orgs.map(o => o.id === orgId ? { ...o, subscription: { ...o.subscription, status: newStatus } } : o));
      toast.success(`Organization ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (orgId, e) => {
    e.stopPropagation(); // Prevent drawer toggle
    
    let confirmMessage = 
      "⚠️ WARNING: You are executing a secure cascading purge on this workspace!\n\n" +
      "This action will permanently:\n" +
      "1. Delete the organization record.\n" +
      "2. Delete all private projects belonging to this workspace.\n" +
      "3. Delete all bugs and test logs registered under those projects.\n" +
      "4. Revoke and delete pending team invitations.\n" +
      "5. Deactivate all members and lock them out of the platform safely.\n\n" +
      "Are you absolutely sure you want to proceed?";

    if (import.meta.env.VITE_APP_ENV === 'production') {
      confirmMessage = `🚨 [CRITICAL PRODUCTION PURGE] 🚨\n\nYou are connected to the LIVE database (${import.meta.env.VITE_FIREBASE_PROJECT_ID}).\n\n` + confirmMessage;
    }

    if (!window.confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      // 1. Fetch bugs
      const bugsRef = collection(db, 'bugs');
      const bugsSnap = await getDocs(bugsRef);
      const bugsToDelete = bugsSnap.docs.filter(d => d.data().organizationId === orgId);

      // 2. Fetch projects
      const projectsRef = collection(db, 'projects');
      const projectsSnap = await getDocs(projectsRef);
      const projectsToDelete = projectsSnap.docs.filter(d => d.data().organizationId === orgId);

      // 3. Fetch invitations
      const invitesRef = collection(db, 'invitations');
      const invitesSnap = await getDocs(invitesRef);
      const invitesToDelete = invitesSnap.docs.filter(d => d.data().organizationId === orgId);

      // 4. Fetch users
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const usersToDeactivate = usersSnap.docs.filter(d => d.data().organizationId === orgId);

      // Initialize atomic transaction batch
      const batch = writeBatch(db);

      // Add bugs to batch delete
      bugsToDelete.forEach(b => {
        batch.delete(doc(db, 'bugs', b.id));
      });

      // Add projects to batch delete
      projectsToDelete.forEach(p => {
        batch.delete(doc(db, 'projects', p.id));
      });

      // Add invitations to batch delete
      invitesToDelete.forEach(inv => {
        batch.delete(doc(db, 'invitations', inv.id));
      });

      // Deactivate and unlink users in batch
      usersToDeactivate.forEach(u => {
        batch.update(doc(db, 'users', u.id), {
          organizationId: null,
          isActive: false,
          is_active: false,
          removedFromOrg: true,
          removed_from_org: true,
          deactivatedAt: new Date()
        });
      });

      // Add organization itself to batch delete
      batch.delete(doc(db, 'organizations', orgId));

      // Commit changes atomically
      await batch.commit();

      setOrganizations(orgs => orgs.filter(o => o.id !== orgId));
      if (expandedOrgId === orgId) setExpandedOrgId(null);
      toast.success('Workspace and all associated resources successfully purged.');
    } catch (err) {
      console.error('[OrganizationsPage] Cascade deletion failed:', err);
      toast.error('Failed to complete cascading workspace deletion.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orgId) => {
    setExpandedOrgId(expandedOrgId === orgId ? null : orgId);
  };

  // Sort & Filter logic
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredOrgs = organizations
    .filter(org => {
      const matchSearch = org.name?.toLowerCase().includes(search.toLowerCase()) || 
                          org.domain?.toLowerCase().includes(search.toLowerCase()) ||
                          org.id?.toLowerCase().includes(search.toLowerCase());
      
      const planId = org.subscription?.plan || org.subscription?.planId || 'free';
      const matchPlan = planFilter === 'all' || planId === planFilter;

      const status = (org.subscription?.status || '').toLowerCase() === 'suspended' ? 'suspended' : 'active';
      const matchStatus = statusFilter === 'all' || status === statusFilter;

      return matchSearch && matchPlan && matchStatus;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'name') {
        valA = a.name?.toLowerCase() || '';
        valB = b.name?.toLowerCase() || '';
      } else if (sortBy === 'createdAt') {
        valA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        valB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      } else if (sortBy === 'plan') {
        valA = a.subscription?.plan || a.subscription?.planId || 'free';
        valB = b.subscription?.plan || b.subscription?.planId || 'free';
      } else if (sortBy === 'status') {
        valA = (a.subscription?.status || '').toLowerCase() === 'suspended' ? 'suspended' : 'active';
        valB = (b.subscription?.status || '').toLowerCase() === 'suspended' ? 'suspended' : 'active';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination bounds
  const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);
  const paginatedOrgs = filteredOrgs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearch('');
    setPlanFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="sa-container">
      {/* Header */}
      <header className="sa-header">
        <div className="sa-title-area">
          <h1 className="sa-title">
            <Building2 size={24} style={{ color: 'var(--sa-rose)' }} />
            Organizations Portal
          </h1>
          <p className="sa-subtitle">Manage SaaS tenant configurations, track team metrics, and allocate resources</p>
        </div>
      </header>

      {/* Main glass card container */}
      <div className="sa-card sa-table-card">
        {/* Modern Search and Filters Panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 16,
          borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
          background: 'rgba(255, 255, 255, 0.4)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flex: 1, minWidth: 260, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search by workspace name, domain, or ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 16px 0 42px',
                  borderRadius: 12,
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  background: '#FFF',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#0F172A',
                  boxShadow: 'var(--shadow-sm)',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* Plan Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', padding: '0 12px', height: 42, borderRadius: 12, border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: 'var(--shadow-sm)' }}>
                <Filter size={14} style={{ color: '#94A3B8' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Plan:</span>
                <select
                  value={planFilter}
                  onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: 'none', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free Trial</option>
                  <option value="pro">Premium Pro</option>
                  <option value="business">Business</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', padding: '0 12px', height: 42, borderRadius: 12, border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: 'none', fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {(search || planFilter !== 'all' || statusFilter !== 'all') && (
                <button 
                  onClick={resetFilters} 
                  className="btn btn-secondary" 
                  style={{ height: 42, borderRadius: 12, padding: '0 16px', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>
            <SkeletonTable rows={5} cols={5} />
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 12 }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.05)', color: 'var(--sa-rose)', width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={24} />
            </div>
            <h4 style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>No tenants found</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300 }}>
              Adjust your search query or clear filters to locate existing tenant workspaces.
            </p>
          </div>
        ) : (
          <div className="sa-table-wrapper">
            <table className="sa-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Workspace / Tenant
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('plan')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Plan
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Status
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('createdAt')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Created Date
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right', paddingRight: 28 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrgs.map(org => {
                  const planId = org.subscription?.plan || org.subscription?.planId || 'free';
                  const isSuspended = (org.subscription?.status || '').toLowerCase() === 'suspended';
                  const isExpanded = expandedOrgId === org.id;

                  // High-fidelity details for the expanded drawer
                  const currentUsage = org.subscription?.aiUsed !== undefined ? Number(org.subscription.aiUsed) : 0;
                  const monthlyLimit = org.subscription?.aiQuota !== undefined ? Number(org.subscription.aiQuota) : 100;
                  const usagePercent = monthlyLimit > 0 ? Math.min(100, Math.round((currentUsage / monthlyLimit) * 100)) : 0;

                  const projectsCount = org.projectsCount ?? 0;
                  const membersCount = org.membersCount ?? 0;
                  const lastActiveDate = org.createdAt?.toDate 
                    ? org.createdAt.toDate().toLocaleDateString()
                    : org.createdAt 
                      ? new Date(org.createdAt).toLocaleDateString()
                      : new Date().toLocaleDateString();

                  return (
                    <>
                      {/* Standard row */}
                      <tr 
                        key={org.id} 
                        className={`sa-row-hover ${isExpanded ? 'sa-row-expanded' : ''}`}
                        onClick={() => toggleExpand(org.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="sa-org-cell">
                            <div className="sa-avatar-logo" style={{ 
                              background: planId === 'business' || planId === 'pro'
                                  ? 'linear-gradient(135deg, var(--sa-indigo) 0%, #C7D2FE 100%)'
                                  : 'linear-gradient(135deg, var(--sa-amber) 0%, #FDE047 100%)'
                            }}>
                              {org.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="sa-org-name">{org.name}</p>
                              <p className="sa-org-domain">{org.domain || `${org.name?.toLowerCase().replace(/\s+/g, '')}.com`}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${planId === 'free' ? 'secondary' : 'primary'}`} style={{ textTransform: 'uppercase' }}>
                            {planId}
                          </span>
                        </td>
                        <td>
                          <div className={`sa-status-pill ${!isSuspended ? 'sa-status-active' : 'sa-status-suspended'}`}>
                            {!isSuspended ? 'Active' : 'Suspended'}
                          </div>
                        </td>
                        <td>
                          {org.createdAt?.toDate ? org.createdAt.toDate().toLocaleDateString() : (org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'N/A')}
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: 28 }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                              className={`sa-btn-action ${isSuspended ? 'sa-action-activate' : 'sa-action-suspend'}`}
                              title={isSuspended ? "Activate Tenant" : "Suspend Tenant"}
                              onClick={(e) => handleSuspend(org.id, org.subscription?.status, e)}
                            >
                              {isSuspended ? <CheckCircle size={14} /> : <ShieldOff size={14} />}
                            </button>
                            <button 
                              className="sa-btn-action sa-action-delete"
                              title="Delete Tenant"
                              onClick={(e) => handleDelete(org.id, e)}
                            >
                              <Trash2 size={14} />
                            </button>
                            <span style={{ color: '#94A3B8', paddingLeft: 4 }}>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable usage drawer */}
                      {isExpanded && (
                        <tr className="sa-drawer-row">
                          <td colSpan="5">
                            <div className="sa-drawer-content">
                              <h4 className="sa-drawer-title">
                                <Info size={14} />
                                Resource Allocation & Usage Metrics ({org.name})
                              </h4>
                              
                              <div className="sa-drawer-grid">
                                {/* Column 1: Core details */}
                                <div className="sa-drawer-card">
                                  <h5 className="sa-drawer-section-title">Tenant Metadata</h5>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div className="sa-drawer-meta-item">
                                      <Mail size={13} style={{ color: '#94A3B8' }} />
                                      <span>Domain: <strong>{org.domain || `${org.name?.toLowerCase().replace(/\s+/g, '')}.com`}</strong></span>
                                    </div>
                                    <div className="sa-drawer-meta-item">
                                      <Clock size={13} style={{ color: '#94A3B8' }} />
                                      <span>Last Sync Activity: <strong>{lastActiveDate}</strong></span>
                                    </div>
                                    <div className="sa-drawer-meta-item">
                                      <Info size={13} style={{ color: '#94A3B8' }} />
                                      <span>Database ID: <code style={{ fontSize: '0.72rem', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{org.id}</code></span>
                                    </div>
                                  </div>
                                </div>

                                {/* Column 2: AI Quota usage bar */}
                                <div className="sa-drawer-card">
                                  <h5 className="sa-drawer-section-title">Generative AI Allocation</h5>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                      <span>Token Consumption</span>
                                      <span>{currentUsage} / {monthlyLimit} ({usagePercent}%)</span>
                                    </div>
                                    <div className="sa-usage-bar-track" style={{ height: 8, background: '#E2E8F0', borderRadius: 99 }}>
                                      <div 
                                        className="sa-usage-bar-fill" 
                                        style={{ 
                                          width: `${usagePercent}%`,
                                          height: '100%',
                                          borderRadius: 99,
                                          background: usagePercent > 80 
                                            ? 'var(--sa-rose)' 
                                            : usagePercent > 50 
                                              ? 'var(--sa-amber)' 
                                              : 'var(--sa-indigo)'
                                        }} 
                                      />
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: 4 }}>
                                      Quota resets automatically on the next billing cycle.
                                    </span>
                                  </div>
                                </div>

                                {/* Column 3: Resource counters */}
                                <div className="sa-drawer-card">
                                  <h5 className="sa-drawer-section-title">Active Resources</h5>
                                  <div style={{ display: 'flex', gap: 16 }}>
                                    <div 
                                      onClick={() => openDetailsModal('projects', org.id, org.name)}
                                      style={{ flex: 1, background: '#F8FAFC', padding: 12, borderRadius: 8, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                    >
                                      <Layers size={16} style={{ color: 'var(--sa-indigo)', margin: '0 auto 4px' }} />
                                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{projectsCount}</div>
                                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Projects</div>
                                    </div>
                                    <div 
                                      onClick={() => openDetailsModal('members', org.id, org.name)}
                                      style={{ flex: 1, background: '#F8FAFC', padding: 12, borderRadius: 8, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                    >
                                      <Users size={16} style={{ color: 'var(--sa-rose)', margin: '0 auto 4px' }} />
                                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{membersCount}</div>
                                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Members</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Premium Pagination Footer */}
        {filteredOrgs.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid rgba(226, 232, 240, 0.6)',
            background: 'rgba(255, 255, 255, 0.3)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing {Math.min(filteredOrgs.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredOrgs.length, currentPage * itemsPerPage)} of {filteredOrgs.length} organizations
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 8, height: 32, padding: '0 12px' }}
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 8, height: 32, padding: '0 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Details Modal */}
      {detailsModal.isOpen && (
        <div 
          onClick={closeDetailsModal} 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: '#FFFFFF',
              width: '100%',
              maxWidth: 600,
              maxHeight: '85vh',
              borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #E2E8F0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10 }}>
                {detailsModal.type === 'members' ? <Users size={20} style={{color: 'var(--sa-rose)'}} /> : <Layers size={20} style={{color: 'var(--sa-indigo)'}} />}
                {detailsModal.type === 'members' ? 'Active Members' : 'Projects'} 
                <span style={{ color: '#64748B', fontWeight: 500 }}>— {detailsModal.orgName}</span>
              </h3>
              <button 
                onClick={closeDetailsModal} 
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: '#64748B', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#E2E8F0'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {detailsModal.loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                  <div style={{ width: 24, height: 24, border: '3px solid #E2E8F0', borderTopColor: 'var(--sa-indigo)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                  Loading data...
                </div>
              ) : detailsModal.data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
                  <Info size={24} style={{ margin: '0 auto 12px', color: '#94A3B8' }} />
                  No {detailsModal.type} found for this organization.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {detailsModal.data.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (detailsModal.type === 'members') {
                          navigate(`/super-admin/users?search=${encodeURIComponent(item.email)}`);
                        }
                      }}
                      style={{ 
                      padding: 16, 
                      border: '1px solid #E2E8F0', 
                      borderRadius: 12, 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      transition: 'border-color 0.2s',
                      cursor: detailsModal.type === 'members' ? 'pointer' : 'default'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      if (detailsModal.type === 'members') e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      if (detailsModal.type === 'members') e.currentTarget.style.background = '#FFFFFF';
                    }}
                    >
                      {detailsModal.type === 'members' ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>
                              {(item.displayName || item.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.95rem' }}>{item.displayName || 'Unknown User'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>{item.email}</div>
                            </div>
                          </div>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            background: item.role === 'admin' || item.role === 'OrgOwner' ? '#FEF2F2' : '#F1F5F9', 
                            color: item.role === 'admin' || item.role === 'OrgOwner' ? '#EF4444' : '#475569', 
                            padding: '4px 10px', 
                            borderRadius: 20, 
                            fontWeight: 600, 
                            textTransform: 'capitalize' 
                          }}>
                            {item.role || 'Member'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.95rem' }}>{item.name || 'Unnamed Project'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>{item.description || 'No description provided'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500, display: 'block', marginBottom: 2 }}>CREATED</span>
                            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                              {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
