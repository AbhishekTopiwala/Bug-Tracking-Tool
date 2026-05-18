import { useState, useEffect } from 'react';
import { 
  Building2, Users, CreditCard, BrainCircuit, 
  ArrowUpRight, ArrowDownRight, Activity, ShieldAlert,
  Search, Filter, MoreVertical, ExternalLink
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalRevenue: 0,
    totalAIUsage: 0,
    activeSubscriptions: 0
  });
  const [recentOrgs, setRecentOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlatformStats() {
      try {
        const orgsSnap = await getDocs(collection(db, 'organizations'));
        const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const totalOrgs = orgs.length;
        const activeSubs = orgs.filter(o => o.subscription?.status === 'active').length;
        const totalAI = orgs.reduce((acc, o) => acc + (o.aiUsage?.currentUsage || 0), 0);
        
        // Mock revenue calculation (Free: 0, Pro: 2999, Enterprise: 9999)
        const revenue = orgs.reduce((acc, o) => {
          const plan = o.subscription?.planId || 'free';
          if (plan === 'pro') return acc + 2999;
          if (plan === 'enterprise') return acc + 9999;
          return acc;
        }, 0);

        setStats({
          totalOrgs,
          totalRevenue: revenue,
          totalAIUsage: totalAI,
          activeSubscriptions: activeSubs
        });

        // Fetch recent organizations
        const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'), limit(5));
        const recentSnap = await getDocs(q);
        setRecentOrgs(recentSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Error fetching super admin stats:", error);
        toast.error("Failed to load platform analytics");
      } finally {
        setLoading(false);
      }
    }

    fetchPlatformStats();
  }, []);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Platform Overview</h1>
          <p className="admin-subtitle">Real-time analytics for Qualia SaaS</p>
        </div>
        <div className="admin-header-actions">
          <button className="btn btn-secondary">
            <Activity size={16} />
            System Status
          </button>
        </div>
      </header>

      {/* ── Stats Grid ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Building2 size={20} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Organizations</p>
            <h3 className="stat-value">{stats.totalOrgs}</h3>
            <span className="stat-trend trend-up">
              <ArrowUpRight size={12} /> 12%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <CreditCard size={20} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Monthly Revenue</p>
            <h3 className="stat-value">₹{stats.totalRevenue.toLocaleString()}</h3>
            <span className="stat-trend trend-up">
              <ArrowUpRight size={12} /> 8%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
            <BrainCircuit size={20} />
          </div>
          <div className="stat-info">
            <p className="stat-label">AI Generation Usage</p>
            <h3 className="stat-value">{stats.totalAIUsage.toLocaleString()}</h3>
            <span className="stat-trend trend-down">
              <ArrowDownRight size={12} /> 3%
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Users size={20} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Active Subscriptions</p>
            <h3 className="stat-value">{stats.activeSubscriptions}</h3>
            <span className="stat-trend trend-up">
              <ArrowUpRight size={12} /> 5%
            </span>
          </div>
        </div>
      </div>

      <div className="admin-grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: 24 }}>
        {/* ── Recent Organizations ── */}
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">Recent Organizations</h3>
            <button className="btn-icon">
              <Search size={16} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Usage</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recentOrgs.map(org => (
                  <tr key={org.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="org-avatar" style={{ 
                          width: 32, height: 32, borderRadius: 8, 
                          background: 'var(--bg-secondary)', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', fontWeight: 600
                        }}>
                          {org.name?.[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{org.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{org.domain}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${org.subscription?.planId === 'free' ? 'secondary' : 'primary'}`}>
                        {org.subscription?.planId?.toUpperCase() || 'FREE'}
                      </span>
                    </td>
                    <td>
                      <div className="status-badge" data-status={org.subscription?.status || 'inactive'}>
                        <span className="status-dot" />
                        {org.subscription?.status || 'Inactive'}
                      </div>
                    </td>
                    <td>
                      <div style={{ width: 100 }}>
                        <div className="progress-bar" style={{ height: 4 }}>
                          <div className="progress-fill" style={{ 
                            width: `${Math.min(100, (org.aiUsage?.currentUsage / org.aiUsage?.monthlyLimit) * 100)}%`,
                            background: (org.aiUsage?.currentUsage / org.aiUsage?.monthlyLimit) > 0.8 ? '#f43f5e' : 'var(--accent)'
                          }} />
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {org.aiUsage?.currentUsage} / {org.aiUsage?.monthlyLimit}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-icon" title="View Organization">
                          <ExternalLink size={14} />
                        </button>
                        <button className="btn-icon">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── System Alerts ── */}
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title">System Alerts</h3>
            <ShieldAlert size={16} color="#f43f5e" />
          </div>
          <div className="alerts-list">
            <div className="system-alert warning">
              <div className="alert-content">
                <p className="alert-title">High AI Usage</p>
                <p className="alert-desc">Infosys has reached 90% of their AI quota.</p>
              </div>
            </div>
            <div className="system-alert error">
              <div className="alert-content">
                <p className="alert-title">Subscription Failed</p>
                <p className="alert-desc">Payment failed for "Startup XYZ" (Pro Plan).</p>
              </div>
            </div>
            <div className="system-alert success">
              <div className="alert-content">
                <p className="alert-title">New Signup</p>
                <p className="alert-desc">Wipro just joined the platform.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .alerts-list { display: flex; flexDirection: column; gap: 12; padding: 16px; }
        .system-alert { 
          padding: 12px; border-radius: 8px; border-left: 4px solid transparent;
          background: var(--bg-secondary);
        }
        .system-alert.warning { border-left-color: #f59e0b; }
        .system-alert.error { border-left-color: #f43f5e; }
        .system-alert.success { border-left-color: #22c55e; }
        .alert-title { fontWeight: 600; fontSize: 0.8125rem; }
        .alert-desc { fontSize: 0.75rem; color: var(--text-muted); marginTop: 2px; }
      `}</style>
    </div>
  );
}
