import { useState } from 'react';
import { User, Shield, Bell, Key, Save, Loader2 } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name cannot be empty');
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: name.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=6366f1&color=fff`,
      });
      await fetchUserProfile(currentUser.uid);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Settings" />
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your account and preferences</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Sidebar Nav */}
          <div className="card" style={{ padding: 12 }}>
            {[
              { key: 'profile', icon: User, label: 'Profile' },
              { key: 'security', icon: Shield, label: 'Security' },
              { key: 'notifications', icon: Bell, label: 'Notifications' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                className={`nav-link ${activeTab === key ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', marginBottom: 2 }}
                onClick={() => setActiveTab(key)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>
            {activeTab === 'profile' && (
              <div className="card">
                <h3 style={{ marginBottom: 24 }}>Profile Information</h3>

                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6366f1&color=fff&size=128`}
                    alt="Avatar"
                    style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid var(--border)' }}
                  />
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>{name || currentUser?.displayName}</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>{currentUser?.email}</p>
                    <span className={`badge badge-${userProfile?.role === 'Developer' ? 'inprogress' : userProfile?.role === 'Admin' ? 'critical' : 'open'}`}>
                      {userProfile?.role || 'QA'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
                  <div className="form-group">
                    <label className="form-label">Display Name</label>
                    <input
                      id="settings-name"
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={currentUser?.email || ''}
                      disabled
                    />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={userProfile?.role || 'QA'}
                      disabled
                    />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Contact an Admin to change your role</p>
                  </div>

                  <button
                    id="settings-save"
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ width: 'fit-content' }}
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card">
                <h3 style={{ marginBottom: 24 }}>Security</h3>
                <div style={{ padding: 24, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 16, maxWidth: 480 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: 2 }}>Password</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Last changed: Never</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => toast('Password reset email sent! (use Firebase Console to configure)', { icon: '📧' })}>
                    Change
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="card">
                <h3 style={{ marginBottom: 24 }}>Notification Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
                  {[
                    { label: 'Bug assigned to me', desc: 'When a bug is assigned to you' },
                    { label: 'Status changes', desc: 'When a bug status is updated' },
                    { label: 'New comments', desc: 'When someone comments on your bug' },
                  ].map(({ label, desc }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</p>
                      </div>
                      <div style={{
                        width: 40, height: 22, borderRadius: 11, background: 'var(--accent)',
                        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                      }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', right: 3, top: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
