import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bug, LayoutDashboard, Plus, Zap, TestTube2,
  Bell, Settings, LogOut, Folder,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/qa', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/qa/projects', icon: Folder, label: 'Projects' },
  { to: '/qa/bugs/new', icon: Plus, label: 'Report Bug' },
  { to: '/qa/ai-generator', icon: Zap, label: 'AI Generator' },
  { to: '/qa/test-cases', icon: TestTube2, label: 'Test Cases' },
];

export default function Sidebar({ unreadCount = 0 }) {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <NavLink to="/qa" className="sidebar-logo">
        <div className="logo-icon">
          <Bug size={18} color="#fff" />
        </div>
        <div className="logo-text">
          <span className="logo-name">BugTrack AI</span>
          <span className="logo-tagline">QA Intelligence Platform</span>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
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
          >
            <Settings size={16} />
            Settings
          </NavLink>
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
  );
}
