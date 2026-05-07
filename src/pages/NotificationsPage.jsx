import { useState, useEffect } from 'react';
import { Bell, CheckCheck, BellOff, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { subscribeToNotifications, markNotificationRead, clearAllNotifications, deleteNotification } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const handleClick = async (notif) => {
    if (!notif.read) await markNotificationRead(notif.id);
    if (notif.bugId) navigate(`/bugs/${notif.bugId}`);
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
  };

  const handleClearAll = async () => {
    if (currentUser?.uid) {
      await clearAllNotifications(currentUser.uid);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Topbar title="Notifications" />
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button className="btn btn-secondary" onClick={markAllRead}>
                <CheckCheck size={15} /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={15} /> Clear All
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72 }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <BellOff size={64} />
            <h3>No notifications</h3>
            <p>You're all caught up! Notifications will appear here when bugs are assigned, commented on, or updated.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {notifications.map((n, idx) => (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                style={{
                  borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                  padding: '16px 20px',
                }}
                onClick={() => handleClick(n)}
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
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px', marginLeft: 16, color: 'var(--text-muted)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  title="Remove notification"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
