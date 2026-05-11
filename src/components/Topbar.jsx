import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, X, Menu, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { markNotificationRead, clearAllNotifications, deleteNotification, subscribeToNotifications } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

export default function Topbar({ title, subtitle, onSearch, onBack }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, setNotifications);
    return () => unsub();
  }, [currentUser]);

  const unread = notifications.filter((n) => !n.read);

  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    setSearchVal(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleNotifClick = async (notif) => {
    if (!notif.read) await markNotificationRead(notif.id);
  };

  const handleClearAll = async () => {
    if (currentUser?.uid) {
      await clearAllNotifications(currentUser.uid);
      setShowNotifs(false);
    }
  };

  return (
    <header className="topbar">
      <button 
        className="sidebar-toggle" 
        onClick={() => document.body.classList.toggle('sidebar-open')}
        aria-label="Toggle Sidebar"
      >
        <Menu size={20} />
      </button>
      <div className="topbar-title-wrap">
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>

      <div className="topbar-actions" style={{ marginLeft: 'auto' }}>
        {/* Search */}
        <div className="topbar-search" style={{ margin: 0, minWidth: 240 }}>
          <div className="search-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="form-control search-input"
              value={searchVal}
              onChange={handleSearch}
              style={{ height: 40, borderRadius: 12 }}
            />
          </div>
        </div>
        {/* Quick create */}
        {userProfile?.role !== 'Developer' && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              const path = userProfile?.role === 'Developer' ? '/dev/bugs/new' : '/qa/bugs/new';
              navigate(path);
            }}
          >
            <Plus size={14} />
            New Bug
          </button>
        )}

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="notification-btn"
            onClick={() => setShowNotifs((v) => !v)}
          >
            <Bell size={18} />
            {unread.length > 0 && <span className="notification-dot" />}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4>Notifications</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {unread.length} unread
                  </span>
                </div>
                {notifications.length > 0 && (
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ fontSize: '0.7rem', padding: '4px 8px', color: 'var(--text-muted)' }}
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  All caught up! 🎉
                </div>
              ) : (
                <div className="notif-list">
                  {notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="notif-icon">
                        <Bell size={14} />
                      </div>
                      <div className="notif-content">
                        <p className="notif-text" dangerouslySetInnerHTML={{ __html: n.message }} />
                        <p className="notif-time">
                          {n.createdAt?.seconds
                            ? formatDistanceToNow(new Date(n.createdAt.seconds * 1000), { addSuffix: true })
                            : 'Just now'}
                        </p>
                      </div>
                      {!n.read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px', marginLeft: 8, color: 'var(--text-muted)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        title="Remove notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
