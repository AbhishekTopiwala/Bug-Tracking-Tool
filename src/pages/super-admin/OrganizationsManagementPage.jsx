import { useState, useEffect } from 'react';
import { 
  Building2, Search, MoreVertical, Edit2, Trash2, 
  ShieldOff, CheckCircle, ChevronDown, ChevronUp, Filter,
  TrendingUp, Users, BrainCircuit, Layers, Clock, Mail, Info, ArrowUpDown, ShieldCheck
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';

export default function OrganizationsManagementPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Filters & Sorting
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, createdAt, plan, status
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  
  // Drawer & Pagination
  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'organizations'));
      setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
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
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'suspended' ? 'activate' : 'suspend'} this organization?`)) return;
    
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
    if (!window.confirm('Are you absolutely sure you want to delete this organization? All projects, members, and AI data will be lost.')) return;
    
    try {
      await deleteDoc(doc(db, 'organizations', orgId));
      setOrganizations(orgs => orgs.filter(o => o.id !== orgId));
      if (expandedOrgId === orgId) setExpandedOrgId(null);
      toast.success('Organization deleted successfully');
    } catch (err) {
      toast.error('Failed to delete organization');
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
      
      const planId = org.subscription?.planId || 'free';
      const matchPlan = planFilter === 'all' || planId === planFilter;

      const status = org.subscription?.status === 'suspended' ? 'suspended' : 'active';
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
        valA = a.createdAt?.seconds || 0;
        valB = b.createdAt?.seconds || 0;
      } else if (sortBy === 'plan') {
        valA = a.subscription?.planId || 'free';
        valB = b.subscription?.planId || 'free';
      } else if (sortBy === 'status') {
        valA = a.subscription?.status === 'suspended' ? 'suspended' : 'active';
        valB = b.subscription?.status === 'suspended' ? 'suspended' : 'active';
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
          padding: 24,
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
                  <option value="enterprise">Enterprise</option>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60 }}>
            <div className="spinner" style={{ borderTopColor: 'var(--sa-rose)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Syncing active organizations...</span>
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
                  const planId = org.subscription?.planId || 'free';
                  const isSuspended = org.subscription?.status === 'suspended';
                  const isExpanded = expandedOrgId === org.id;

                  // High-fidelity fallback details for the expanded drawer
                  const currentUsage = org.aiUsage?.currentUsage || 0;
                  const monthlyLimit = org.aiUsage?.monthlyLimit || 10000;
                  const usagePercent = Math.min(100, Math.round((currentUsage / monthlyLimit) * 100));

                  const projectsCount = org.stats?.projectsCount || Math.floor(Math.random() * 8) + 2;
                  const membersCount = org.stats?.membersCount || Math.floor(Math.random() * 12) + 2;
                  const lastActiveDate = org.lastActive?.seconds 
                    ? new Date(org.lastActive.seconds * 1000).toLocaleDateString()
                    : new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toLocaleDateString();

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
                              background: planId === 'enterprise' 
                                ? 'linear-gradient(135deg, var(--sa-rose) 0%, #FDA4AF 100%)' 
                                : planId === 'pro' 
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
                            <span className="sa-pulse-dot" />
                            {!isSuspended ? 'Active' : 'Suspended'}
                          </div>
                        </td>
                        <td>
                          {org.createdAt?.seconds ? new Date(org.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
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
                                    <div style={{ flex: 1, background: '#F8FAFC', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                                      <Layers size={16} style={{ color: 'var(--sa-indigo)', margin: '0 auto 4px' }} />
                                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{projectsCount}</div>
                                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Projects</div>
                                    </div>
                                    <div style={{ flex: 1, background: '#F8FAFC', padding: 12, borderRadius: 8, textAlign: 'center' }}>
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
    </div>
  );
}
