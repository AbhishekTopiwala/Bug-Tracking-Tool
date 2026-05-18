import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CreditCard, BrainCircuit, 
  Settings, LogOut, ShieldAlert, BarChart3, Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const superAdminNavItems = [
  { to: '/super-admin', icon: LayoutDashboard, label: 'Platform Overview', exact: true },
  { to: '/super-admin/organizations', icon: Building2, label: 'Organizations', exact: false },
  { to: '/super-admin/subscriptions', icon: CreditCard, label: 'Subscriptions', exact: false },
  { to: '/super-admin/ai-usage', icon: BrainCircuit, label: 'AI Analytics', exact: false },
];

const systemItems = [
  { to: '/super-admin/health', icon: Activity, label: 'System Health', exact: false },
  { to: '/super-admin/settings', icon: Settings, label: 'Global Settings', exact: false },
];

export default function SuperAdminSidebar() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const avatarUrl = userProfile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'Super')}&background=F43F5E&color=fff`;

  return (
    <>
      <aside className="admin-sidebar" style={{ borderRight: '2px solid rgba(244, 63, 94, 0.1)' }}>
        <NavLink to="/super-admin" className="sidebar-logo" onClick={closeSidebar}>
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)' }}>
            <ShieldAlert size={18} color="white" />
          </div>
          <div className="logo-text">
            <span className="logo-name">Qualia</span>
            <span className="logo-tagline" style={{ color: '#F43F5E' }}>
              <ShieldAlert size={12} />
              Super Admin
            </span>
          </div>
        </NavLink>

        <nav className="sidebar-nav">
          <p className="nav-section-label" style={{ paddingTop: 8 }}>Management</p>
          {superAdminNavItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active super-admin' : ''}`}
              onClick={closeSidebar}
              style={({ isActive }) => isActive ? { color: '#F43F5E', background: 'rgba(244, 63, 94, 0.05)' } : {}}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          <div className="nav-section">
            <p className="nav-section-label">System</p>
            {systemItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active super-admin' : ''}`}
                onClick={closeSidebar}
                style={({ isActive }) => isActive ? { color: '#F43F5E', background: 'rgba(244, 63, 94, 0.05)' } : {}}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} title="Click to logout">
            <div className="user-avatar-wrapper">
              <img
                src={avatarUrl}
                alt={currentUser?.displayName}
                className="user-avatar"
              />
              <div className="status-indicator" style={{ background: '#F43F5E' }} />
            </div>
            <div className="user-info">
              <p className="user-name">{currentUser?.displayName || 'Super Admin'}</p>
              <p className="user-role">Platform Owner</p>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>
      <div className="sidebar-backdrop" onClick={closeSidebar} />
      <style>{`
        .admin-nav-link.active.super-admin::after {
          background-color: #F43F5E !important;
        }
      `}</style>
    </>
  );
}
