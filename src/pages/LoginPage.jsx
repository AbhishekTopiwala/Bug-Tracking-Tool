import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, Eye, EyeOff, Loader2, Code2, Sparkles, CheckCircle2, Mail, Lock, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, fetchUserProfile } = useAuth();
  const navigate = useNavigate();

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!forgotEmail) return toast.error('Please enter your email address');
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.toLowerCase());
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgot(false);
      setForgotEmail('');
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address'
          : 'Failed to send reset email. Try again.';
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const { user } = await login(email.toLowerCase(), password);
      const profile = await fetchUserProfile(user.uid);
      if (!profile || profile.isActive === false) {
        return;
      }
      toast.success('Welcome back!');
      if (profile?.role === 'Developer') {
        navigate('/dev');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const isDev = false;

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
              <div className="auth-brand-tagline">From visual glance to structured resolution</div>
            </div>
          </div>

          <h2 className="auth-marketing-title">Modern <span className="text-gradient">bug tracking</span> for QA teams and Developers</h2>
          <p className="auth-marketing-subtitle">Create, assign and resolve bugs faster with AI powered workflows.</p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: isDev ? 'var(--dev-accent)' : 'var(--accent)', background: isDev ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)' }}><Sparkles size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">AI Bug Generator</span>
                <span className="auth-feature-desc">Automatically generate titles and steps</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: isDev ? 'var(--dev-accent)' : 'var(--accent)', background: isDev ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)' }}><Bug size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Smart QA Workflow</span>
                <span className="auth-feature-desc">Assign and track bugs efficiently</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: isDev ? 'var(--dev-accent)' : 'var(--accent)', background: isDev ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)' }}><Code2 size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Developer Collaboration</span>
                <span className="auth-feature-desc">Seamlessly integrate with dev tools</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: isDev ? 'var(--dev-accent)' : 'var(--accent)', background: isDev ? 'rgba(16, 185, 129, 0.1)' : 'rgba(91, 108, 255, 0.1)' }}><CheckCircle2 size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Screenshot & Video Uploads</span>
                <span className="auth-feature-desc">Attach visual proofs instantly</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Section */}
        <div className="auth-right">
          <div className="auth-card">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your Qualia account to continue</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Email Address</label>
                <div className={`auth-input-wrapper ${isDev ? 'dev-wrapper' : ''}`}>
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    className={`auth-input ${isDev ? 'dev-focus' : ''}`}
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setShowForgot(true); }}
                    style={{ margin: 0, background: 'none', border: 'none', cursor: 'pointer', color: isDev ? 'var(--dev-accent)' : 'var(--accent)', fontWeight: 500, fontSize: '0.85rem', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className={`auth-input-wrapper ${isDev ? 'dev-wrapper' : ''}`}>
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className={`auth-input ${isDev ? 'dev-focus' : ''}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: isDev ? 'var(--dev-accent)' : 'var(--accent)', cursor: 'pointer' }}
                />
                <label htmlFor="rememberMe" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Remember me for 30 days</label>
              </div>

              <button
                id="login-submit"
                type="submit"
                className={`auth-btn ${isDev ? 'dev-btn' : ''}`}
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account?{' '}
              <Link to="/signup" className={isDev ? 'dev-link' : ''}>
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button
              onClick={() => setShowForgot(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reset Password</h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="auth-btn" disabled={forgotLoading} style={{ marginTop: 4 }}>
                {forgotLoading ? <Loader2 size={18} className="spin" /> : null}
                {forgotLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
