import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, User, Mail, Lock, BarChart3, Building2, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', workspaceName: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.workspaceName) return toast.error('Please fill in all fields');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name, 'Admin', '6366f1', form.workspaceName);
      toast.success(`Welcome to Qualia! Your workspace is ready.`);
      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? (err.message.includes('password') ? err.message : 'An account with this email already exists')
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
              <div className="auth-brand-tagline">Enterprise Bug Tracking Platform</div>
            </div>
          </div>

          <h2 className="auth-marketing-title">Create your <span className="text-gradient">Organization Workspace</span></h2>
          <p className="auth-marketing-subtitle">Set up your company's dedicated bug tracking environment and invite your team.</p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)' }}><Building2 size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Isolated Workspaces</span>
                <span className="auth-feature-desc">Secure, multi-tenant environment for your company</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)' }}><Users size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Role-Based Access</span>
                <span className="auth-feature-desc">Manage QA, Developers, and Managers with ease</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)' }}><ShieldCheck size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Enterprise Security</span>
                <span className="auth-feature-desc">Data isolation and strict permission controls</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)' }}><CheckCircle2 size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Subscription Ready</span>
                <span className="auth-feature-desc">Flexible plans scaling with your team's growth</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Section */}
        <div className="auth-right">
          <div className="auth-card" style={{ maxWidth: 500, padding: '40px 48px' }}>
            <h1 className="auth-title">Create Organization</h1>
            <p className="auth-subtitle">Set up your admin account and workspace</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Organization Name</label>
                <div className="auth-input-wrapper">
                  <BarChart3 size={18} className="auth-input-icon" />
                  <input
                    id="signup-workspace"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Acme Corp"
                    value={form.workspaceName}
                    onChange={update('workspaceName')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Admin Full Name</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Alex Johnson"
                    value={form.name}
                    onChange={update('name')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Admin Email</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    className="auth-input"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={update('email')}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      id="signup-password"
                      type={showPass ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Min 6 chars"
                      value={form.password}
                      onChange={update('password')}
                      style={{ paddingRight: 36 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Confirm Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      id="signup-confirm"
                      type="password"
                      className="auth-input"
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
                className="auth-btn"
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : null}
                {loading ? 'Creating Organization...' : 'Create Organization Workspace'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link to="/login">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

