import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CreditCard, BrainCircuit, 
  Settings, LogOut, ShieldAlert, Activity, ChevronLeft, ChevronRight,
  User, ExternalLink, Globe, LayoutGrid, Terminal, Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const superAdminNavItems = [
  { to: '/super-admin', icon: LayoutDashboard, label: 'Platform Overview', exact: true },
  { to: '/super-admin/organizations', icon: Building2, label: 'Organizations', exact: false },
  { to: '/super-admin/users', icon: Users, label: 'User Control', exact: false },
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Sync collapsed state to document body
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sa-sidebar-collapsed');
    } else {
      document.body.classList.remove('sa-sidebar-collapsed');
    }
    return () => {
      document.body.classList.remove('sa-sidebar-collapsed');
    };
  }, [isCollapsed]);

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  const avatarUrl = userProfile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'Super')}&background=F43F5E&color=fff`;

  return (
    <>
      <aside className={`admin-sidebar sa-sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: isCollapsed ? '76px' : '260px',
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(244, 63, 94, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible'
      }}>
        
        {/* ── Collapsible Toggle Trigger ── */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="sa-sidebar-collapse-trigger"
          style={{
            position: 'absolute',
            right: '-12px',
            top: '28px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '1px solid rgba(244, 63, 94, 0.15)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--sa-rose)',
            cursor: 'pointer',
            zIndex: 102,
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* ── Switcher Logo Block ── */}
        <div style={{ position: 'relative', zIndex: 101 }}>
          <div 
            className="sa-sidebar-logo-switcher" 
            onClick={() => setSwitcherOpen(!switcherOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              gap: 12,
              padding: isCollapsed ? '12px' : '14px 16px',
              margin: '8px 12px 16px',
              background: 'rgba(244, 63, 94, 0.04)',
              border: '1px solid rgba(244, 63, 94, 0.08)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              height: 48
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="logo-icon" style={{ 
                background: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
                width: 28,
                height: 28,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldAlert size={14} color="white" />
              </div>
              {!isCollapsed && (
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'block', lineHeight: 1.2 }}>Qualia</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--sa-rose)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    Super Admin
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <span className="sa-switcher-badge" style={{ fontSize: '0.6rem' }}>SYS</span>
            )}
          </div>

          {/* Switcher Dropdown Popover */}
          {switcherOpen && (
            <div className="sa-action-dropdown" style={{
              position: 'absolute',
              top: 'calc(100% - 10px)',
              left: 12,
              right: 12,
              width: isCollapsed ? 200 : 'auto',
              background: '#FFFFFF',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
              padding: 6,
              zIndex: 102
            }}>
              <p style={{ margin: '6px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Switch Workspace
              </p>
              
              <button 
                onClick={() => { setSwitcherOpen(false); navigate('/super-admin'); }}
                className="sa-dropdown-item"
                style={{ background: 'rgba(244, 63, 94, 0.05)', color: 'var(--sa-rose)', width: '100%', border: 'none', cursor: 'pointer' }}
              >
                <Terminal size={14} />
                <span>Super Admin</span>
              </button>

              <button 
                onClick={() => { setSwitcherOpen(false); navigate('/admin'); }}
                className="sa-dropdown-item"
                style={{ width: '100%', border: 'none', cursor: 'pointer' }}
              >
                <LayoutGrid size={14} style={{ color: '#64748B' }} />
                <span>Tenant Admin</span>
              </button>

              <button 
                onClick={() => { setSwitcherOpen(false); navigate('/developer'); }}
                className="sa-dropdown-item"
                style={{ width: '100%', border: 'none', cursor: 'pointer' }}
              >
                <Globe size={14} style={{ color: '#64748B' }} />
                <span>Developer Portal</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar Navigation ── */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {!isCollapsed && <p className="nav-section-label" style={{ padding: '8px 12px 4px', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>Management</p>}
          
          {superAdminNavItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active super-admin' : ''}`}
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
                justifyContent: isCollapsed ? 'center' : 'flex-start'
              }}
              title={isCollapsed ? label : ""}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>{label}</span>}
            </NavLink>
          ))}

          <div style={{ marginTop: 16 }}>
            {!isCollapsed && <p className="nav-section-label" style={{ padding: '8px 12px 4px', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>System</p>}
            {systemItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active super-admin' : ''}`}
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
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                title={isCollapsed ? label : ""}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ── Premium User Profile Footer ── */}
        <div className="sidebar-footer" style={{ 
          padding: '16px 12px', 
          borderTop: '1px solid rgba(244, 63, 94, 0.08)',
          background: 'rgba(255, 255, 255, 0.2)'
        }}>
          <div 
            className="user-card" 
            onClick={handleLogout} 
            title="Click to logout safely"
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
              <div className="user-avatar-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={avatarUrl}
                  alt={currentUser?.displayName}
                  className="user-avatar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '1.5px solid var(--sa-rose)',
                    objectFit: 'cover'
                  }}
                />
                <span className="sa-pulse-dot" style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  background: 'var(--sa-emerald)',
                  borderRadius: '50%',
                  border: '1.5px solid #FFF',
                  boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.2)'
                }} />
              </div>
              {!isCollapsed && (
                <div className="user-info" style={{ textAlign: 'left', minWidth: 0 }}>
                  <p className="user-name" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {currentUser?.displayName || 'Super Admin'}
                  </p>
                  <p className="user-role" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>Platform Owner</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <LogOut size={13} style={{ color: '#94A3B8', flexShrink: 0, transition: 'all 0.15s ease' }} className="sa-logout-icon" />
            )}
          </div>
        </div>
      </aside>

      <div className="sidebar-backdrop" onClick={closeSidebar} />
      
      {/* Dynamic collapsing support overrides */}
      <style>{`
        body.sa-sidebar-collapsed .main-content {
          margin-left: 76px !important;
        }
        .sa-sidebar-collapse-trigger:hover {
          transform: scale(1.1);
          border-color: var(--sa-rose) !important;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.18) !important;
        }
        .user-card:hover {
          background: rgba(244, 63, 94, 0.04) !important;
        }
        .user-card:hover .sa-logout-icon {
          color: var(--sa-rose) !important;
          transform: translateX(2px);
        }
      `}</style>
    </>
  );
}
