import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, User, Mail, Lock, Building2, ShieldCheck, Check, Globe, Receipt, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PLANS, saveSelectedPlan, getSelectedPlan, PAYMENT_STATUS } from '../services/paymentService';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

// Disposable email domains blocklist (abbreviated)
const DISPOSABLE_DOMAINS = ['mailinator.com','guerrillamail.com','tempmail.com','throwam.com','yopmail.com','trashmail.com'];

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

function validatePassword(pass) {
  const checks = {
    length: pass.length >= 8,
    upper: /[A-Z]/.test(pass),
    lower: /[a-z]/.test(pass),
    number: /\d/.test(pass),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, strong: score >= 4 };
}

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'Germany', 'France', 'UAE', 'Other'
];

export default function SignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signup } = useAuth();

  // Pre-selected plan from landing page
  const locationState = location.state;
  const sessionPlan = getSelectedPlan();
  const initialPlanId = locationState?.planId || sessionPlan?.planId;
  const initialCycle = locationState?.billingCycle || sessionPlan?.billingCycle || 'monthly';
  const selectedPlanData = initialPlanId ? PLANS[initialPlanId] : null;

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    workspaceName: '',
    country: 'India',
    gstNumber: '',
    terms: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [key]: val }));
    setFieldErrors(err => ({ ...err, [key]: '' }));
  };

  const passStrength = validatePassword(form.password);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address';
    else if (isDisposableEmail(form.email)) errors.email = 'Disposable email addresses are not allowed';
    if (!form.workspaceName.trim()) errors.workspaceName = 'Organization name is required';
    if (form.workspaceName.trim().length < 2) errors.workspaceName = 'Must be at least 2 characters';
    if (!form.password) errors.password = 'Password is required';
    else if (!passStrength.strong) errors.password = 'Password must be at least 8 chars with uppercase, number & special character';
    if (form.password !== form.confirm) errors.confirm = 'Passwords do not match';
    if (!form.terms) errors.terms = 'You must accept the Terms & Conditions';
    if (form.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNumber)) {
      errors.gstNumber = 'Enter a valid 15-digit GST number';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      // Duplicate email check
      const emailQ = query(collection(db, 'users'), where('email', '==', form.email.toLowerCase().trim()));
      const emailSnap = await getDocs(emailQ);
      if (!emailSnap.empty) {
        const existingUser = emailSnap.docs[0].data();
        // If user exists with PAYMENT_PENDING, let them login instead
        if (existingUser.paymentStatus === PAYMENT_STATUS.PENDING || existingUser.paymentStatus === PAYMENT_STATUS.FAILED) {
          toast.error('An account with this email already exists. Please login to complete your payment.');
          navigate('/login', { state: { email: form.email } });
          return;
        }
        setFieldErrors(err => ({ ...err, email: 'This email is already registered. Try logging in.' }));
        return;
      }

      // Create user with PAYMENT_PENDING status (org NOT created yet)
      const user = await signup(
        form.email.trim(),
        form.password,
        form.name.trim(),
        'Admin',
        '6366f1',
        form.workspaceName.trim(),
        {
          // Extended signup data
          country: form.country,
          gstNumber: form.gstNumber.trim() || null,
          planId: initialPlanId || 'free',
          billingCycle: initialCycle,
          paymentPending: true, // Signal to AuthContext to NOT create org
        }
      );

      toast.success('Account created! Proceeding to payment...');

      // Save plan selection for payment page
      if (initialPlanId) {
        saveSelectedPlan(initialPlanId, initialCycle);
      }

      // Redirect to payment
      if (initialPlanId && initialPlanId !== 'free') {
        navigate('/payment', {
          state: { planId: initialPlanId, billingCycle: initialCycle }
        });
      } else {
        // Free plan → go directly to payment page to activate
        navigate('/payment', {
          state: { planId: 'free', billingCycle: 'monthly' }
        });
      }
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Please log in.'
        : (err.message || 'Signup failed. Please try again.');
      toast.error(msg);
      if (err.code === 'auth/email-already-in-use') {
        navigate('/login', { state: { email: form.email } });
      }
    } finally {
      setLoading(false);
    }
  }

  const planBadgeColor = selectedPlanData?.popular ? '#5B6CFF' : '#64748b';

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: 1100 }}>
        {/* Left Branding */}
        <div className="auth-left">
          <div className="auth-brand-header">
            <div className="auth-logo-container">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <circle cx="15" cy="15" r="11" stroke="url(#sg1)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="52 14" />
                <path d="M22 22L29 29" stroke="url(#sg2)" strokeWidth="3.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="sg1" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#8F9BFF" />
                  </linearGradient>
                  <linearGradient id="sg2" x1="22" y1="22" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="auth-brand-text">
              <div className="auth-brand-name">Qualia</div>
              <div className="auth-brand-tagline">Enterprise Bug Tracking Platform</div>
            </div>
          </div>

          {selectedPlanData && (
            <div className="signup-plan-preview" style={{ borderColor: planBadgeColor + '44' }}>
              <div className="signup-plan-badge" style={{ background: planBadgeColor + '18', color: planBadgeColor }}>
                {selectedPlanData.popular ? '⭐ Most Popular' : 'Selected Plan'}
              </div>
              <div className="signup-plan-name">{selectedPlanData.name}</div>
              <div className="signup-plan-price">
                {selectedPlanData.monthlyPrice === 0
                  ? 'Free'
                  : selectedPlanData.monthlyPrice === null
                    ? 'Custom'
                    : `₹${selectedPlanData[initialCycle === 'yearly' ? 'yearlyPrice' : 'monthlyPrice']?.toLocaleString('en-IN')}/${initialCycle === 'yearly' ? 'yr' : 'mo'}`}
              </div>
              <div className="signup-plan-features">
                {selectedPlanData.features.filter(f => f.included).slice(0, 4).map((f, i) => (
                  <div key={i} className="signup-plan-feature">
                    <Check size={12} style={{ color: '#22c55e' }} />
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="auth-features">
            {[
              { icon: <Building2 size={16} />, title: 'Isolated Workspaces', desc: 'Created after successful payment' },
              { icon: <ShieldCheck size={16} />, title: 'Enterprise Security', desc: 'Data isolation & strict permissions' },
              { icon: <Receipt size={16} />, title: 'GST Invoice', desc: 'Auto-generated tax invoice on payment' },
              { icon: <Globe size={16} />, title: 'Team Ready', desc: 'Invite your team immediately after setup' },
            ].map((f, i) => (
              <div key={i} className="auth-feature-item">
                <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}>{f.icon}</div>
                <div className="auth-feature-text">
                  <span className="auth-feature-title">{f.title}</span>
                  <span className="auth-feature-desc">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form */}
        <div className="auth-right">
          <div className="auth-card" style={{ maxWidth: 520, padding: '36px 44px' }}>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">
              {selectedPlanData ? `Setting up ${selectedPlanData.name} plan · Payment next` : 'Set up your admin account and workspace'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }} noValidate>

              {/* Organization Name */}
              <div className="form-group">
                <label className="form-label">Organization Name *</label>
                <div className="auth-input-wrapper">
                  <Building2 size={17} className="auth-input-icon" />
                  <input
                    id="signup-workspace"
                    type="text"
                    className={`auth-input ${fieldErrors.workspaceName ? 'input-error' : ''}`}
                    placeholder="e.g. Acme Corp"
                    value={form.workspaceName}
                    onChange={update('workspaceName')}
                  />
                </div>
                {fieldErrors.workspaceName && <p className="field-error">{fieldErrors.workspaceName}</p>}
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Admin Full Name *</label>
                <div className="auth-input-wrapper">
                  <User size={17} className="auth-input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    className={`auth-input ${fieldErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Alex Johnson"
                    value={form.name}
                    onChange={update('name')}
                  />
                </div>
                {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Work Email *</label>
                <div className="auth-input-wrapper">
                  <Mail size={17} className="auth-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    className={`auth-input ${fieldErrors.email ? 'input-error' : ''}`}
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={update('email')}
                  />
                </div>
                {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
              </div>

              {/* Country + GST row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <div className="auth-input-wrapper">
                    <Globe size={17} className="auth-input-icon" />
                    <select
                      className="auth-input auth-select"
                      value={form.country}
                      onChange={update('country')}
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">GST Number <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                  <div className="auth-input-wrapper">
                    <Receipt size={17} className="auth-input-icon" />
                    <input
                      type="text"
                      className={`auth-input ${fieldErrors.gstNumber ? 'input-error' : ''}`}
                      placeholder="22AAAAA0000A1Z5"
                      value={form.gstNumber}
                      onChange={update('gstNumber')}
                      maxLength={15}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  {fieldErrors.gstNumber && <p className="field-error">{fieldErrors.gstNumber}</p>}
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="auth-input-wrapper">
                    <Lock size={17} className="auth-input-icon" />
                    <input
                      id="signup-password"
                      type={showPass ? 'text' : 'password'}
                      className={`auth-input ${fieldErrors.password ? 'input-error' : ''}`}
                      placeholder="Min 8 chars"
                      value={form.password}
                      onChange={update('password')}
                      style={{ paddingRight: 36 }}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="password-strength-bar">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`strength-segment ${i < passStrength.score ? 'filled' : ''}`}
                          style={{ background: i < passStrength.score ? (passStrength.score >= 4 ? '#22c55e' : passStrength.score >= 2 ? '#f59e0b' : '#ef4444') : undefined }}
                        />
                      ))}
                    </div>
                  )}
                  {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <div className="auth-input-wrapper">
                    <Lock size={17} className="auth-input-icon" />
                    <input
                      id="signup-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      className={`auth-input ${fieldErrors.confirm ? 'input-error' : ''}`}
                      placeholder="Repeat password"
                      value={form.confirm}
                      onChange={update('confirm')}
                      style={{ paddingRight: 36 }}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(s => !s)} tabIndex={-1}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErrors.confirm && <p className="field-error">{fieldErrors.confirm}</p>}
                </div>
              </div>

              {/* Terms */}
              <div className="form-group">
                <label className="signup-terms-label">
                  <input
                    type="checkbox"
                    id="signup-terms"
                    checked={form.terms}
                    onChange={update('terms')}
                    className="signup-terms-checkbox"
                  />
                  <span>
                    I agree to the{' '}
                    <a href="#" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                  </span>
                </label>
                {fieldErrors.terms && <p className="field-error">{fieldErrors.terms}</p>}
              </div>

              <button
                id="signup-submit"
                type="submit"
                className="auth-btn"
                disabled={loading}
                style={{ marginTop: 4 }}
              >
                {loading ? <Loader2 size={17} className="spin" /> : null}
                {loading ? 'Creating Account...' : (
                  <>
                    Create Account & Continue
                    <ArrowRight size={16} style={{ marginLeft: 6 }} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
