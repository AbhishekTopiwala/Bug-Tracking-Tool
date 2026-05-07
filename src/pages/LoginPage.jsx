import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, Eye, EyeOff, Loader2, Code2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, fetchUserProfile, currentUser } = useAuth();
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

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 44, height: 44, borderRadius: 12 }}>
            <Bug size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>BugTrack AI</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QA Intelligence Platform</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in — you'll be redirected to your portal automatically</p>

        {/* Role hint cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--accent-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Bug size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>QA Portal</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Create & track bugs, use AI tools</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.2)', background: 'var(--dev-accent-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Code2 size={13} style={{ color: 'var(--dev-accent)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dev-accent)' }}>Dev Portal</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>View assigned bugs, fix & update status</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                className="btn-icon"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
