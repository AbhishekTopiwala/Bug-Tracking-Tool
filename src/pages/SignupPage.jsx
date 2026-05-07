import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, Eye, EyeOff, Code2, FlaskConical, Loader2 } from 'lucide-react';
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
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'QA' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const selectedRole = ROLES.find((r) => r.key === form.role);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Please fill in all fields');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name, form.role, selectedRole.avatarBg);
      toast.success(`Welcome to BugTrack AI! ${form.role === 'Developer' ? '👨‍💻' : '🧪'}`);
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
      <div className="auth-bg" />
      <div className="auth-card" style={{ maxWidth: 520 }}>
        {/* Logo */}
        <div className="auth-logo">
          <div
            className="logo-icon"
            style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${selectedRole.accent}, ${selectedRole.accent}cc)` }}
          >
            <Bug size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>BugTrack AI</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QA Intelligence Platform</div>
          </div>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Choose your role to get started</p>

        {/* Role Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {ROLES.map(({ key, icon: Icon, label, desc, accent, accentBg, accentBorder }) => {
            const isSelected = form.role === key;
            return (
              <button
                key={key}
                type="button"
                id={`role-${key.toLowerCase()}`}
                onClick={() => setForm((f) => ({ ...f, role: key }))}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${isSelected ? accentBorder : 'var(--border)'}`,
                  background: isSelected ? accentBg : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition)',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon size={16} style={{ color: isSelected ? accent : 'var(--text-muted)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? accent : 'var(--text-primary)' }}>
                    {label}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</p>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Full Name</label>
              <input
                id="signup-name"
                type="text"
                className="form-control"
                placeholder="e.g. Alex Johnson"
                value={form.name}
                onChange={update('name')}
                style={{ '--focus-color': selectedRole.accent }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="signup-email"
              type="email"
              className="form-control"
              placeholder="you@company.com"
              value={form.email}
              onChange={update('email')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPass ? 'text' : 'password'}
                className="form-control"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={update('password')}
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

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              id="signup-confirm"
              type="password"
              className="form-control"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={update('confirm')}
            />
          </div>

          <button
            id="signup-submit"
            type="submit"
            className="btn btn-lg"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: 4,
              background: `linear-gradient(135deg, ${selectedRole.accent}, ${selectedRole.accent}cc)`,
              color: '#fff',
              border: 'none',
            }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : null}
            {loading ? 'Creating account...' : `Join as ${selectedRole.label}`}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" style={{ color: selectedRole.accent, fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
