import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Bell, Settings, LogOut,
  ShieldCheck, BarChart3, Folder, Palette,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const adminNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/admin/team', icon: Users, label: 'Team', exact: false },
  { to: '/admin/projects', icon: Folder, label: 'Projects', exact: false },
];

const accountItems = [
  { to: '/admin/notifications', icon: Bell, label: 'Notifications', exact: false },
  { to: '/admin/branding', icon: Palette, label: 'Branding', exact: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', exact: false },
];

export default function AdminSidebar({ unreadCount = 0 }) {
  const { currentUser, userProfile, logout, branding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const avatarUrl = userProfile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'Admin')}&background=5B6CFF&color=fff`;

  return (
    <>
      <aside className="admin-sidebar">
        <NavLink to="/admin" className="sidebar-logo" onClick={closeSidebar}>
          <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.portalName} style={{ objectFit: 'contain' }} />
            ) : (
              <img src="/Qapture.png" alt="Qapture" />
            )}
          </div>
          <div className="logo-text">
            <span className="logo-name">{branding.portalName || 'Qapture'}</span>
            <span className="logo-tagline" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={12} />
              Admin Portal
            </span>
          </div>
        </NavLink>

        {/* ── Main Nav ── */}
        <nav className="sidebar-nav">
          <p className="nav-section-label" style={{ paddingTop: 8 }}>Management</p>
          {adminNavItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => {
                const isProjects = label === 'Projects';
                const isBugsPath = location.pathname.includes('/bugs');
                const isProjectPath = location.pathname.includes('/projects');
                const shouldBeActive = isActive || (isProjects && (isBugsPath || isProjectPath));
                return `admin-nav-link ${shouldBeActive ? 'active' : ''}`;
              }}
              onClick={closeSidebar}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          <div className="nav-section">
            <p className="nav-section-label">Account</p>
            {accountItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon size={16} />
                {label}
                {label === 'Notifications' && unreadCount > 0 && (
                  <span className="admin-nav-badge">{unreadCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ── User Footer Redesigned ── */}
        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} title="Click to logout">
            <div className="user-avatar-wrapper">
              <img
                src={avatarUrl}
                alt={currentUser?.displayName}
                className="user-avatar"
              />
              <div className="status-indicator" />
            </div>
            <div className="user-info">
              <p className="user-name">{currentUser?.displayName || 'Admin'}</p>
              <p className="user-role">Logout</p>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      <div className="sidebar-backdrop" onClick={closeSidebar} />
    </>
  );
}
