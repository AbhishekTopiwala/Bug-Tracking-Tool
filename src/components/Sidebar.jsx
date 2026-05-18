import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bug, LayoutDashboard, Plus, Zap, TestTube2,
  Bell, Settings, LogOut, Folder, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/qa', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/qa/projects', icon: Folder, label: 'Projects' },
  { to: '/qa/bugs/new', icon: Plus, label: 'Report Bug' },
  { to: '/qa/ai-generator', icon: Zap, label: 'AI Bug Generator' },
  { to: '/qa/test-cases', icon: TestTube2, label: 'Test Cases' },
];

export default function Sidebar({ unreadCount = 0 }) {
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

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <NavLink to="/qa" className="sidebar-logo" onClick={closeSidebar}>
          <div className="logo-icon">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.portalName} style={{ objectFit: 'contain' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="11" stroke="url(#qualia-grad-side)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="52 14" />
                <path d="M22 22L29 29" stroke="url(#qualia-grad-side-prism)" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M19 19L23 23" stroke="#5B6CFF" strokeWidth="3.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="qualia-grad-side" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5B6CFF" />
                    <stop offset="1" stopColor="#8F9BFF" />
                  </linearGradient>
                  <linearGradient id="qualia-grad-side-prism" x1="22" y1="22" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5B6CFF" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
          <div className="logo-text">
            <span className="logo-name">{branding.portalName || 'Qualia'}</span>
            <span className="logo-tagline">QA Portal</span>
          </div>
        </NavLink>


        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => {
                const isProjects = label === 'Projects';
                const isReportBug = label === 'Report Bug';
                const isBugsPath = location.pathname.includes('/bugs');
                const isProjectPath = location.pathname.includes('/projects');

                // Projects is active for project list, project detail, and bug detail/edit
                // But NOT for the global "Report Bug" context if it's separate (though here they share same target now)
                let shouldBeActive = isActive;
                if (isProjects && (isBugsPath || isProjectPath)) {
                  // Only highlight Projects for bugs if it's a specific bug, not the "new bug" form
                  if (!location.pathname.includes('/bugs/new')) {
                    shouldBeActive = true;
                  }
                }

                // Report Bug is only active if the label matches and we are actually on a "new bug" path 
                // or if the user just clicked it (target is projects)
                if (isReportBug) {
                  shouldBeActive = location.pathname.includes('/bugs/new');
                }

                return `nav-link ${shouldBeActive ? 'active' : ''}`;
              }}
              onClick={closeSidebar}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          <div className="nav-section">
            <p className="nav-section-label">Account</p>
            <NavLink
              to="/qa/notifications"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <Bell size={16} />
              Notifications
              {unreadCount > 0 && (
                <span className="nav-link-badge">{unreadCount}</span>
              )}
            </NavLink>
            <NavLink
              to="/qa/settings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <Settings size={16} />
              Settings
            </NavLink>
            {['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role) && (
              <NavLink
                to="/qa/team"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <Users size={16} />
                Team
              </NavLink>
            )}
          </div>
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} title="Click to logout">
            <img
              src={userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'U')}&background=6366f1&color=fff`}
              alt={currentUser?.displayName}
              className="user-avatar"
            />
            <div className="user-info">
              <p className="user-name">{currentUser?.displayName || 'User'}</p>
              <p className="user-role">{userProfile?.role || 'QA'} · Logout</p>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>
      <div className="sidebar-backdrop" onClick={closeSidebar} />
    </>
  );
}
