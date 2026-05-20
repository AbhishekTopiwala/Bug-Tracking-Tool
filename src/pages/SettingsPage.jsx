import { useState, useEffect } from 'react';
import { User, Shield, Bell, Key, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import Topbar from '../components/Topbar';
import AdminTopbar from '../components/AdminTopbar';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [preferences, setPreferences] = useState({
    bugAssigned: userProfile?.notificationPreferences?.bugAssigned !== false,
    statusChanges: userProfile?.notificationPreferences?.statusChanges !== false,
    newComments: userProfile?.notificationPreferences?.newComments !== false,
  });

  useEffect(() => {
    if (userProfile?.notificationPreferences) {
      setPreferences({
        bugAssigned: userProfile.notificationPreferences.bugAssigned !== false,
        statusChanges: userProfile.notificationPreferences.statusChanges !== false,
        newComments: userProfile.notificationPreferences.newComments !== false,
      });
    }
  }, [userProfile]);

  const handleTogglePreference = async (key) => {
    const newVal = !preferences[key];
    const updatedPrefs = { ...preferences, [key]: newVal };
    
    setPreferences(updatedPrefs);
    
    const toastId = toast.loading('Saving preference...');
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        notificationPreferences: updatedPrefs
      });
      await fetchUserProfile(currentUser.uid);
      toast.success('Preference updated!', { id: toastId });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      setPreferences(preferences);
      toast.error('Failed to update preference', { id: toastId });
    }
  };

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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('Please fill in all password fields');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }

    setUpdatingPass(true);
    const toastId = toast.loading('Updating password...');
    try {
      // 1. Reauthenticate user with their current password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // 2. Update password in Firebase Auth
      await updatePassword(auth.currentUser, newPassword);
      
      toast.success('Password updated successfully!', { id: toastId });
      
      // Clear forms
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      let errMsg = 'Failed to update password';
      if (error.code === 'auth/wrong-password') {
        errMsg = 'Incorrect current password';
      } else if (error.code === 'auth/weak-password') {
        errMsg = 'Password is too weak';
      } else if (error.message) {
        errMsg = error.message;
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setUpdatingPass(false);
    }
  };

  const isAdmin = userProfile?.role === 'Admin';

  return (
    <>
      {isAdmin ? (
        <AdminTopbar title="Settings" />
      ) : (
        <Topbar title="Settings" />
      )}
      <div className="page-container">


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
                <h3 style={{ marginBottom: 8 }}>Security Settings</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                  Change your password directly. You will need to provide your current password for security verification.
                </p>

                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        id="settings-current-password"
                        type={showCurrentPass ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          color: 'var(--text-muted)',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {showCurrentPass ? <EyeOff size={16} style={{ pointerEvents: 'none' }} /> : <Eye size={16} style={{ pointerEvents: 'none' }} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        id="settings-new-password"
                        type={showNewPass ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          color: 'var(--text-muted)',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {showNewPass ? <EyeOff size={16} style={{ pointerEvents: 'none' }} /> : <Eye size={16} style={{ pointerEvents: 'none' }} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      id="settings-confirm-password"
                      type={showNewPass ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    id="settings-update-password"
                    type="submit"
                    className="btn btn-primary"
                    disabled={updatingPass}
                    style={{ width: 'fit-content', marginTop: 8 }}
                  >
                    {updatingPass ? (
                      <>
                        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={15} />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Key size={15} />
                        Update Password
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="card">
                <h3 style={{ marginBottom: 24 }}>Notification Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
                  {[
                    { key: 'bugAssigned', label: 'Bug assigned to me', desc: 'When a bug is assigned to you' },
                    { key: 'statusChanges', label: 'Status changes', desc: 'When a bug status is updated' },
                    { key: 'newComments', label: 'New comments', desc: 'When someone comments on your bug' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</p>
                      </div>
                      <div 
                        id={`settings-toggle-notification-${key}`}
                        onClick={() => handleTogglePreference(key)}
                        style={{
                          width: 40, 
                          height: 22, 
                          borderRadius: 11, 
                          background: preferences[key] ? 'var(--accent, #6366f1)' : '#cbd5e1',
                          position: 'relative', 
                          cursor: 'pointer', 
                          transition: 'background 0.2s',
                        }}
                      >
                        <div style={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          background: '#fff', 
                          position: 'absolute', 
                          left: preferences[key] ? 21 : 3, 
                          top: 3,
                          transition: 'left 0.2s ease-in-out'
                        }} />
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
