import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, Eye, EyeOff, Loader2, Code2, Sparkles, CheckCircle2, FlaskConical, User, Mail, Lock, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROLES = [
  {
    key: 'QA',
    icon: FlaskConical,
    label: 'QA Engineer',
    desc: 'Create & manage bugs, use AI tools, assign to developers',
    accent: 'var(--accent)',
    accentBg: 'var(--accent-light)',
    accentBorder: 'rgba(99,102,241,0.3)',
    avatarBg: '6366f1',
  },
  {
    key: 'Developer',
    icon: Code2,
    label: 'Developer',
    desc: 'View assigned bugs, update status, collaborate with QA',
    accent: 'var(--dev-accent)',
    accentBg: 'var(--dev-accent-light)',
    accentBorder: 'rgba(16,185,129,0.3)',
    avatarBg: '10b981',
  },
];

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'QA', workspaceName: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const selectedRole = ROLES.find((r) => r.key === form.role);
  const isDev = form.role === 'Developer';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.workspaceName) return toast.error('Please fill in all fields');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name, form.role, selectedRole.avatarBg, form.workspaceName);
      toast.success(`Welcome to Qualia! ${form.role === 'Developer' ? '👨‍💻' : '🧪'}`);
      navigate(form.role === 'Developer' ? '/dev' : '/');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists'
        : err.message || 'Signup failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

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
          <div className="auth-card" style={{ maxWidth: 500, padding: '40px 48px' }}>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Choose your role to get started</p>

            {/* Interactive Role Toggle */}
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${!isDev ? 'active-qa' : ''}`}
                onClick={() => setForm((f) => ({ ...f, role: 'QA' }))}
              >
                <FlaskConical size={16} /> QA Engineer
              </button>
              <button
                type="button"
                className={`role-btn ${isDev ? 'active-dev' : ''}`}
                onClick={() => setForm((f) => ({ ...f, role: 'Developer' }))}
              >
                <Code2 size={16} /> Developer
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Workspace Name</label>
                <div className={`auth-input-wrapper ${isDev ? 'dev-wrapper' : ''}`}>
                  <BarChart3 size={18} className="auth-input-icon" />
                  <input
                    id="signup-workspace"
                    type="text"
                    className={`auth-input ${isDev ? 'dev-focus' : ''}`}
                    placeholder="e.g. Acme Corp"
                    value={form.workspaceName}
                    onChange={update('workspaceName')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Full Name</label>
                <div className={`auth-input-wrapper ${isDev ? 'dev-wrapper' : ''}`}>
                  <User size={18} className="auth-input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    className={`auth-input ${isDev ? 'dev-focus' : ''}`}
                    placeholder="e.g. Alex Johnson"
                    value={form.name}
                    onChange={update('name')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Email Address</label>
                <div className={`auth-input-wrapper ${isDev ? 'dev-wrapper' : ''}`}>
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    className={`auth-input ${isDev ? 'dev-focus' : ''}`}
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={update('email')}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Password</label>
                  <div className={`auth-input-wrapper ${isDev ? 'dev-wrapper' : ''}`}>
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      id="signup-password"
                      type={showPass ? 'text' : 'password'}
                      className={`auth-input ${isDev ? 'dev-focus' : ''}`}
                      placeholder="Min 6 chars"
                      value={form.password}
                      onChange={update('password')}
                      style={{ paddingRight: 36 }}
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

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Confirm</label>
                  <div className={`auth-input-wrapper ${isDev ? 'dev-wrapper' : ''}`}>
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      id="signup-confirm"
                      type="password"
                      className={`auth-input ${isDev ? 'dev-focus' : ''}`}
                      placeholder="Repeat pass"
                      value={form.confirm}
                      onChange={update('confirm')}
                    />
                  </div>
                </div>
              </div>

              <button
                id="signup-submit"
                type="submit"
                className={`auth-btn ${isDev ? 'dev-btn' : ''}`}
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : null}
                {loading ? 'Creating account...' : `Join as ${selectedRole.label}`}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link to="/login" className={isDev ? 'dev-link' : ''}>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
