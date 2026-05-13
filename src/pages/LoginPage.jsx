import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, Eye, EyeOff, Loader2, Code2, Sparkles, CheckCircle2, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, fetchUserProfile } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const { user } = await login(email, password);
      // Fetch role from Firestore and redirect accordingly
      const profile = await fetchUserProfile(user.uid);
      toast.success('Welcome back!');
      if (profile?.role === 'Developer') {
        navigate('/dev');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential'
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
          <div className="auth-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: 'var(--accent-light)', borderRadius: 'var(--radius)', padding: '6px' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="15" cy="15" r="11" stroke="url(#qualia-grad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="52 14" />
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
            <div className="auth-brand-name" style={{ fontFamily: "'Outfit', 'Inter', sans-serif", letterSpacing: '-0.03em', fontWeight: 700 }}>Qualia</div>
            <div className="auth-brand-tagline">From visual glance to structured resolution</div>
          </div>
        </div>

        <h2 className="auth-marketing-title">Modern bug tracking for QA teams and Developers</h2>
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
                <a href="#" className={isDev ? 'dev-link' : ''} style={{ margin: 0, textDecoration: 'none', color: isDev ? 'var(--dev-accent)' : 'var(--accent)', fontWeight: 500, fontSize: '0.85rem' }}>Forgot password?</a>
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
    </div>
  );
}
