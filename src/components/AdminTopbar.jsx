import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Menu, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  markNotificationRead,
  clearAllNotifications,
  deleteNotification,
  subscribeToNotifications,
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

/**
 * AdminTopbar — same notification logic as Topbar but styled for the Admin portal.
 * Does NOT show "New Bug" button (admins manage people, not bugs directly).
 */
export default function AdminTopbar({ title, subtitle, onSearch }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const { currentUser } = useAuth();
  const [searchVal, setSearchVal] = useState('');

  const handleSearch = (e) => {
    setSearchVal(e.target.value);
    onSearch?.(e.target.value);
  };

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, setNotifications);
    return () => unsub();
  }, [currentUser]);

  const unread = notifications.filter((n) => !n.read);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    <header className="admin-topbar">
      {/* Hamburger (mobile only) */}
      <button
        className="sidebar-toggle"
        onClick={() => document.body.classList.toggle('sidebar-open')}
        aria-label="Toggle Sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="admin-topbar-title-wrap">
        <div className="admin-topbar-title">{title}</div>
        {subtitle && <div className="admin-topbar-subtitle">{subtitle}</div>}
      </div>

      {onSearch && (
        <div className="admin-topbar-search">
          <div className="admin-search-wrapper">
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="admin-search-input"
              value={searchVal}
              onChange={handleSearch}
            />
          </div>
        </div>
      )}

      <div className="topbar-actions">
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="admin-notification-btn"
            onClick={() => setShowNotifs((v) => !v)}
          >
            <Bell size={18} />
            {unread.length > 0 && <span className="admin-notification-dot" />}
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
                      <div className="notif-icon" style={{ background: 'rgba(91, 108, 255, 0.12)', color: '#5B6CFF' }}>
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
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--admin-accent)', flexShrink: 0, marginTop: 4 }} />
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px', marginLeft: 8, color: 'var(--text-muted)' }}
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
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
