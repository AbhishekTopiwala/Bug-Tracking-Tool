import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, BarChart3,
  Settings, LogOut, Building2, Bell, CreditCard,
  FileText, ChevronLeft, ChevronRight, Shield,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const orgNavItems = [
  { to: '/org', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/org/admins', icon: Users, label: 'Admin Management', exact: false },
  { to: '/org/projects', icon: FolderKanban, label: 'Projects', exact: false },
  { to: '/org/team', icon: UsersRound, label: 'Team Visibility', exact: false },
  { to: '/org/reports', icon: BarChart3, label: 'Reports & Analytics', exact: false },
];

const systemItems = [
  { to: '/org/billing', icon: CreditCard, label: 'Billing', exact: false },
  { to: '/org/settings', icon: Settings, label: 'Settings', exact: false },
  { to: '/org/audit-logs', icon: FileText, label: 'Audit Logs', exact: false },
  { to: '/org/notifications', icon: Bell, label: 'Notifications', exact: false },
];

export default function OrgSidebar({ unreadCount = 0 }) {
  const { currentUser, userProfile, logout, branding } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('org-sidebar-collapsed');
    } else {
      document.body.classList.remove('org-sidebar-collapsed');
    }
    return () => document.body.classList.remove('org-sidebar-collapsed');
  }, [isCollapsed]);

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const avatarUrl = userProfile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'Owner')}&background=7C3AED&color=fff`;

  return (
    <>
      <aside className={`admin-sidebar org-sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: isCollapsed ? '76px' : '260px',
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(124, 58, 237, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible'
      }}>

        {/* ── Collapse Toggle ── */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="org-sidebar-collapse-trigger"
          style={{
            position: 'absolute',
            right: '-12px',
            top: '28px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '1px solid rgba(124, 58, 237, 0.15)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--org-purple)',
            cursor: 'pointer',
            zIndex: 102,
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* ── Logo Block ── */}
        <div style={{ position: 'relative', zIndex: 101 }}>
          <NavLink
            to="/org"
            onClick={closeSidebar}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: 12,
              padding: isCollapsed ? '12px' : '14px 16px',
              margin: '8px 12px 16px',
              background: 'rgba(124, 58, 237, 0.04)',
              border: '1px solid rgba(124, 58, 237, 0.08)',
              borderRadius: '12px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              height: 48
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.portalName} style={{ width: 18, height: 18, objectFit: 'contain' }} />
              ) : (
                <Building2 size={14} color="white" />
              )}
            </div>
            {!isCollapsed && (
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'block', lineHeight: 1.2 }}>
                  {branding.portalName || 'Qualia'}
                </span>
                <span style={{
                  fontSize: '0.68rem', color: 'var(--org-purple)', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 3
                }}>
                  <Shield size={9} />
                  Organization Portal
                </span>
              </div>
            )}
          </NavLink>
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {!isCollapsed && (
            <p className="nav-section-label" style={{
              padding: '8px 12px 4px', fontSize: '0.68rem', textTransform: 'uppercase',
              fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em'
            }}>Management</p>
          )}

          {orgNavItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active org-owner' : ''}`}
              onClick={closeSidebar}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#64748B',
                transition: 'all 0.2s ease',
                height: 40,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                textDecoration: 'none'
              }}
              title={isCollapsed ? label : ''}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>{label}</span>}
            </NavLink>
          ))}

          <div style={{ marginTop: 16 }}>
            {!isCollapsed && (
              <p className="nav-section-label" style={{
                padding: '8px 12px 4px', fontSize: '0.68rem', textTransform: 'uppercase',
                fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em'
              }}>Organization</p>
            )}
            {systemItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active org-owner' : ''}`}
                onClick={closeSidebar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#64748B',
                  transition: 'all 0.2s ease',
                  height: 40,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  textDecoration: 'none'
                }}
                title={isCollapsed ? label : ''}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!isCollapsed && (
                  <span>{label}</span>
                )}
                {!isCollapsed && label === 'Notifications' && unreadCount > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: 'var(--org-purple)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 100
                  }}>{unreadCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ── User Footer ── */}
        <div className="sidebar-footer" style={{
          padding: '16px 12px',
          borderTop: '1px solid rgba(124, 58, 237, 0.08)',
          background: 'rgba(255, 255, 255, 0.2)'
        }}>
          <div
            className="user-card"
            onClick={handleLogout}
            title="Click to logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              gap: 10,
              padding: isCollapsed ? '4px' : '8px 10px',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={avatarUrl}
                  alt={currentUser?.displayName}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '1.5px solid var(--org-purple)',
                    objectFit: 'cover'
                  }}
                />
              </div>
              {!isCollapsed && (
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {currentUser?.displayName || 'Organization Owner'}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>
                    Logout
                  </p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <LogOut size={13} style={{ color: '#94A3B8', flexShrink: 0, transition: 'all 0.15s ease' }} className="org-logout-icon" />
            )}
          </div>
        </div>
      </aside>

      <div className="sidebar-backdrop" onClick={closeSidebar} />

      {/* Dynamic collapsing support */}
      <style>{`
        body.org-sidebar-collapsed .main-content {
          margin-left: 76px !important;
        }
        .org-sidebar-collapse-trigger:hover {
          transform: scale(1.1);
          border-color: var(--org-purple) !important;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.18) !important;
        }
        .org-sidebar .user-card:hover {
          background: rgba(124, 58, 237, 0.04) !important;
        }
        .org-sidebar .user-card:hover .org-logout-icon {
          color: var(--org-purple) !important;
          transform: translateX(2px);
        }
      `}</style>
    </>
  );
}
