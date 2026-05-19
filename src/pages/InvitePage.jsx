import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Loader2, Mail, Lock, User, Sparkles, Code2, Bug, CheckCircle2, Building, ShieldCheck, ArrowRight, Compass
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { getDocs, query, collection, where, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const navigate = useNavigate();

  const { signup, login, fetchUserProfile } = useAuth();

  // Mode: 'signup' or 'login'
  const [mode, setMode] = useState('signup');
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);

  // Invite states
  const [inviteDetails, setInviteDetails] = useState(null);

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: emailParam,
    password: '',
    confirm: ''
  });

  const [showPass, setShowPass] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Load invitation details from Firestore
  useEffect(() => {
    async function verifyInvite() {
      if (!emailParam) return;
      setCheckingInvite(true);
      try {
        const q = query(collection(db, 'users'), where('email', '==', emailParam.toLowerCase()));
        const snap = await getDocs(q);
        
        let foundInvite = null;
        for (const d of snap.docs) {
          const data = d.data();
          if (data.invited) {
            foundInvite = { id: d.id, ...data };
            break;
          }
        }

        if (foundInvite) {
          // Fetch Organization Name
          let orgName = 'Your Workspace';
          if (foundInvite.organizationId) {
            const orgDoc = await getDoc(doc(db, 'organizations', foundInvite.organizationId));
            if (orgDoc.exists()) {
              orgName = orgDoc.data().name || orgName;
            }
          }
          setInviteDetails({
            ...foundInvite,
            organizationName: orgName
          });
          // Prefill name if available
          if (foundInvite.name) {
            setForm(prev => ({ ...prev, name: foundInvite.name, email: foundInvite.email }));
          }
        } else {
          console.warn("[InvitePage] No active invitation found for this email address.");
        }
      } catch (err) {
        console.error("[InvitePage] Error checking invitation:", err);
      } finally {
        setCheckingInvite(false);
      }
    }

    verifyInvite();
  }, [emailParam]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      return toast.error('Please fill in all required fields');
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!form.name) {
          setLoading(false);
          return toast.error('Please enter your full name');
        }
        if (form.password !== form.confirm) {
          setLoading(false);
          return toast.error('Passwords do not match');
        }
        if (form.password.length < 6) {
          setLoading(false);
          return toast.error('Password must be at least 6 characters');
        }

        // Use the role from the invite details (default to 'Developer' as fallback)
        const invitedRole = inviteDetails?.role || 'Developer';
        // Organization ID will be pulled automatically by the signup hook from the placeholder user!
        await signup(form.email, form.password, form.name, invitedRole, '6366f1', '');
        toast.success(`Welcome to Qualia! Your team profile has been activated.`);
      } else {
        // Login mode
        const { user } = await login(form.email.toLowerCase(), form.password);
        const profile = await fetchUserProfile(user.uid);
        if (!profile || profile.isActive === false) {
          setLoading(false);
          return;
        }
        toast.success('Successfully joined workspace!');
      }

      // Successful Auth context will route the user to their target dashboard (QA or Developer) via /
      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Please log in instead.'
        : err.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : err.message || 'Operation failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const isDevRole = inviteDetails?.role === 'Developer';

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Branding Section */}
        <div className="auth-left">
          <div className="auth-brand-header">
            <div className="auth-logo-container">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="11" stroke="url(#qualia-grad)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="52 14" />
                <path d="M22 22L29 29" stroke="url(#qualia-grad-prism)" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M19 19L23 23" stroke="#5B6CFF" strokeWidth="3.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="qualia-grad" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5B6CFF" />
                    <stop offset="1" stopColor="#8F9BFF" />
                  </linearGradient>
                  <linearGradient id="qualia-grad-prism" x1="22" y1="22" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5B6CFF" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="auth-brand-text">
              <div className="auth-brand-name">Qualia</div>
              <div className="auth-brand-tagline">Enterprise Bug Tracking Platform</div>
            </div>
          </div>

          <h2 className="auth-marketing-title">Join your <span className="text-gradient">Company Workspace</span></h2>
          <p className="auth-marketing-subtitle">Collaborate seamlessly with QA testers and developers to track, analyze, and resolve bugs faster.</p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: isDevRole ? 'var(--dev-accent)' : 'var(--accent)', background: isDevRole ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)' }}><Building size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Connected Workspace</span>
                <span className="auth-feature-desc">Access organization-wide projects, bugs, and dashboards</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: isDevRole ? 'var(--dev-accent)' : 'var(--accent)', background: isDevRole ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)' }}><ShieldCheck size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Strict Role Authorization</span>
                <span className="auth-feature-desc">Work securely with role-tailored dashboards and capabilities</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: isDevRole ? 'var(--dev-accent)' : 'var(--accent)', background: isDevRole ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)' }}><Compass size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">AI-Powered QA</span>
                <span className="auth-feature-desc">Accelerate testing cycles with automated test scripts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Section */}
        <div className="auth-right">
          <div className="auth-card" style={{ maxWidth: 500, padding: '40px 48px' }}>
            
            {checkingInvite ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <Loader2 className="spin" size={36} color={isDevRole ? "var(--dev-accent)" : "var(--accent)"} />
                <p style={{ marginTop: 16, color: 'var(--text-muted)', fontWeight: 500 }}>Verifying your invitation...</p>
              </div>
            ) : (
              <>
                <h1 className="auth-title">Accept Workspace Invitation</h1>
                
                {inviteDetails ? (
                  <div style={{
                    background: 'rgba(91, 108, 255, 0.05)',
                    border: '1px solid rgba(91, 108, 255, 0.15)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    margin: '16px 0 24px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
                      <CheckCircle2 size={18} color="var(--accent)" />
                      <span>Invitation Confirmed!</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      You've been invited by <strong style={{ color: 'var(--text-primary)' }}>{inviteDetails.invitedByEmail || inviteDetails.invitedBy}</strong> to join the <strong style={{ color: 'var(--text-primary)' }}>{inviteDetails.organizationName}</strong> workspace as a <strong style={{ color: inviteDetails.role === 'Developer' ? 'var(--dev-accent)' : 'var(--accent)' }}>{inviteDetails.role}</strong>.
                    </p>
                  </div>
                ) : (
                  <p className="auth-subtitle">Verify your email address below to join your assigned workspace.</p>
                )}

                {/* Tab Switcher */}
                <div style={{
                  display: 'flex',
                  background: 'var(--bg-primary)',
                  padding: '4px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  marginBottom: '24px'
                }}>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      background: mode === 'signup' ? 'var(--bg-card)' : 'transparent',
                      color: mode === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'all 0.2s',
                      boxShadow: mode === 'signup' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      background: mode === 'login' ? 'var(--bg-card)' : 'transparent',
                      color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'all 0.2s',
                      boxShadow: mode === 'login' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    I Have an Account
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {mode === 'signup' && (
                    <div className="form-group">
                      <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Full Name</label>
                      <div className={`auth-input-wrapper ${isDevRole ? 'dev-wrapper' : ''}`}>
                        <User size={18} className="auth-input-icon" />
                        <input
                          id="invite-name"
                          type="text"
                          className="auth-input"
                          placeholder="e.g. Alex Johnson"
                          value={form.name}
                          onChange={update('name')}
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Email Address</label>
                    <div className={`auth-input-wrapper ${isDevRole ? 'dev-wrapper' : ''}`}>
                      <Mail size={18} className="auth-input-icon" />
                      <input
                        id="invite-email"
                        type="email"
                        className="auth-input"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={update('email')}
                        disabled={!!emailParam}
                        style={emailParam ? { opacity: 0.7, background: 'var(--bg-primary)', cursor: 'not-allowed' } : {}}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Password</label>
                    <div className={`auth-input-wrapper ${isDevRole ? 'dev-wrapper' : ''}`}>
                      <Lock size={18} className="auth-input-icon" />
                      <input
                        id="invite-password"
                        type="password"
                        className="auth-input"
                        placeholder="Enter secure password"
                        value={form.password}
                        onChange={update('password')}
                      />
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <div className="form-group">
                      <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Confirm Password</label>
                      <div className={`auth-input-wrapper ${isDevRole ? 'dev-wrapper' : ''}`}>
                        <Lock size={18} className="auth-input-icon" />
                        <input
                          id="invite-confirm"
                          type="password"
                          className="auth-input"
                          placeholder="Confirm secure password"
                          value={form.confirm}
                          onChange={update('confirm')}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    id="invite-submit"
                    type="submit"
                    className={`auth-btn ${isDevRole ? 'dev-btn' : ''}`}
                    disabled={loading}
                    style={{ marginTop: '10px' }}
                  >
                    {loading && <Loader2 size={18} className="spin" style={{ marginRight: 8 }} />}
                    <span>{mode === 'signup' ? 'Accept & Join Workspace' : 'Sign In & Join Workspace'}</span>
                  </button>
                </form>
              </>
            )}

            <div className="auth-footer" style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Need a new workspace instead?{' '}
              <Link to="/signup" style={{ color: isDevRole ? 'var(--dev-accent)' : 'var(--accent)', fontWeight: 600 }}>
                Create Organization
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
