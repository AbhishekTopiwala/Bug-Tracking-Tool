import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Bell, Settings, LogOut, CheckCircle2, Folder } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const devNavItems = [
  { to: '/dev', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/dev/bugs', icon: ListTodo, label: 'My Board' },
  { to: '/dev/projects', icon: Folder, label: 'Projects' },
  { to: '/dev/notifications', icon: Bell, label: 'Notifications' },
  { to: '/dev/settings', icon: Settings, label: 'Settings' },
];

export default function DevSidebar({ unreadCount = 0 }) {
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
      <aside className="dev-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="dev-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.portalName} style={{ objectFit: 'contain' }} />
            ) : (
              <img src="/Qapture.png" alt="Qapture" />
            )}
          </div>
          <div className="logo-text">
            <span className="logo-name">{branding.portalName || 'Qapture'}</span>
            <span className="logo-tagline">Developer Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {devNavItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => {
                const isProjects = label === 'Projects';
                const isMyBoard = label === 'My Board';
                const isBugsPath = location.pathname.includes('/bugs');
                const isProjectPath = location.pathname.includes('/projects');
                
                // If we are on My Board (/dev/bugs), only My Board should be active.
                // Projects should be active on /dev/projects... OR if we are on bugs but NOT the main board (though dev/bugs is the board).
                // Actually, if a project is selected in the URL, maybe Projects should be active.
                const hasProjectParam = new URLSearchParams(location.search).get('project');
                
                let shouldBeActive = isActive;
                if (isProjects) {
                  shouldBeActive = isActive || isProjectPath || (isBugsPath && hasProjectParam);
                }
                if (isMyBoard) {
                  shouldBeActive = isActive && !hasProjectParam;
                }

                return `dev-nav-link ${shouldBeActive ? 'active' : ''}`;
              }}
              onClick={closeSidebar}
            >
              <Icon size={16} />
              {label}
              {label === 'Notifications' && unreadCount > 0 && (
                <span className="nav-link-badge" style={{ background: 'var(--dev-accent-light)', color: 'var(--dev-accent)' }}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}


        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} title="Click to logout">
            <img
              src={userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'D')}&background=10b981&color=fff`}
              alt={currentUser?.displayName}
              className="user-avatar"
            />
            <div className="user-info">
              <p className="user-name">{currentUser?.displayName || 'Developer'}</p>
              <p className="user-role" style={{ color: 'var(--dev-accent)' }}>Developer · Logout</p>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>
      <div className="sidebar-backdrop" onClick={closeSidebar} />
    </>
  );
}
