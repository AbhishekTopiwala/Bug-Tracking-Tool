import { NavLink, useNavigate } from 'react-router-dom';
import { Code2, ListTodo, Bell, Settings, LogOut, CheckCircle2, Folder } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const devNavItems = [
  { to: '/dev', icon: ListTodo, label: 'My Bugs', exact: true },
  { to: '/dev/projects', icon: Folder, label: 'Projects' },
  { to: '/dev/notifications', icon: Bell, label: 'Notifications' },
  { to: '/dev/settings', icon: Settings, label: 'Settings' },
];

export default function DevSidebar({ unreadCount = 0 }) {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="dev-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="dev-logo-icon">
          <img src="/Qapture.png" alt="Qapture" />
        </div>
        <div className="logo-text">
          <span className="logo-name">Qapture</span>
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
            className={({ isActive }) => `dev-nav-link ${isActive ? 'active' : ''}`}
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
  );
}
