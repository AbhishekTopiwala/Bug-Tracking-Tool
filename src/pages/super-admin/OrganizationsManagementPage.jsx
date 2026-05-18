import { useState, useEffect } from 'react';
import { Building2, Search, MoreVertical, Edit2, Trash2, ShieldOff, CheckCircle } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';

export default function OrganizationsManagementPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const handleSuspend = async (orgId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'suspended' ? 'activate' : 'suspend'} this organization?`)) return;
    try {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(db, 'organizations', orgId), { 'subscription.status': newStatus });
      setOrganizations(orgs => orgs.map(o => o.id === orgId ? { ...o, subscription: { ...o.subscription, status: newStatus } } : o));
      toast.success(`Organization ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (orgId) => {
    if (!window.confirm('Are you absolutely sure you want to delete this organization? This action is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId));
      setOrganizations(orgs => orgs.filter(o => o.id !== orgId));
      toast.success('Organization deleted');
    } catch (err) {
      toast.error('Failed to delete organization');
    }
  };

  const filteredOrgs = organizations.filter(o => o.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Organizations</h1>
          <p className="admin-subtitle">Manage all workspaces and tenants</p>
        </div>
      </header>

      <div className="admin-card">
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="search-wrapper tm-search" style={{ width: 300 }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="spinner-container"><div className="spinner" /></div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map(org => {
                  const isSuspended = org.subscription?.status === 'suspended';
                  return (
                    <tr key={org.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="org-avatar" style={{ 
                            width: 36, height: 36, borderRadius: 8, 
                            background: 'var(--accent)', color: '#fff', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', fontWeight: 600
                          }}>
                            {org.name?.[0]}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600 }}>{org.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {org.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${org.subscription?.planId === 'free' ? 'secondary' : 'primary'}`}>
                          {org.subscription?.planId?.toUpperCase() || 'FREE'}
                        </span>
                      </td>
                      <td>
                        <div className="status-badge" data-status={isSuspended ? 'error' : (org.subscription?.status || 'active')}>
                          <span className="status-dot" />
                          {isSuspended ? 'Suspended' : (org.subscription?.status || 'Active')}
                        </div>
                      </td>
                      <td>
                        {org.createdAt?.seconds ? new Date(org.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-icon" 
                            title={isSuspended ? "Activate" : "Suspend"}
                            onClick={() => handleSuspend(org.id, org.subscription?.status)}
                          >
                            {isSuspended ? <CheckCircle size={16} /> : <ShieldOff size={16} />}
                          </button>
                          <button 
                            className="btn-icon" 
                            title="Delete"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleDelete(org.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
