import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, User, Mail, Lock, Building2, ShieldCheck, Check, Globe, Receipt, Eye, EyeOff, ArrowRight, Sparkles, Bug, Code2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PLANS, saveSelectedPlan, getSelectedPlan, PAYMENT_STATUS } from '../services/paymentService';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

// Disposable email domains blocklist (abbreviated)
const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com', 'yopmail.com', 'trashmail.com'];

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

  const [selectedPlanId, setSelectedPlanId] = useState(locationState?.planId || sessionPlan?.planId || 'free');
  const [billingCycle, setBillingCycle] = useState(locationState?.billingCycle || sessionPlan?.billingCycle || 'monthly');
  const selectedPlanData = PLANS[selectedPlanId];

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
      // Duplicate email check (best-effort — runs before auth so may fail with permission-denied
      // for unauthenticated users. Firebase Auth's own email-already-in-use error is the true guard.)
      try {
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
      } catch (emailCheckErr) {
        // Firestore permission-denied for unauthenticated users — skip the check.
        // Firebase Auth will still block duplicate emails with auth/email-already-in-use.
        console.warn('[Signup] Pre-auth email check skipped (expected for unauthenticated users):', emailCheckErr.code);
      }

      // Create user with PAYMENT_PENDING status (org NOT created yet)
      const user = await signup(
        form.email.trim(),
        form.password,
        form.name.trim(),
        'OrgOwner',
        '6366f1',
        form.workspaceName.trim(),
        {
          // Extended signup data
          country: form.country,
          gstNumber: form.gstNumber.trim() || null,
          planId: selectedPlanId,
          billingCycle: billingCycle,
          paymentPending: true, // Signal to AuthContext to NOT create org
        }
      );

      toast.success('Account created! Proceeding to payment...');

      // Save plan selection for payment page
      saveSelectedPlan(selectedPlanId, billingCycle);

      // Redirect to payment
      if (selectedPlanId !== 'free') {
        navigate('/payment', {
          state: { planId: selectedPlanId, billingCycle: billingCycle }
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
      <div className="auth-container" style={{ maxWidth: '1200px' }}>
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

          {selectedPlanData && (
            <div className="premium-pricing-card" style={{ width: '100%', maxWidth: '400px', marginTop: '16px', marginBottom: '0' }}>
              {selectedPlanData.popular && (
                <div className="premium-pricing-badge">Most Popular</div>
              )}
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#4B5563', marginBottom: '8px' }}>
                {selectedPlanData.name} Plan
              </div>
              <div className="premium-pricing-price" style={{ marginBottom: '20px' }}>
                {selectedPlanData.monthlyPrice === 0
                  ? 'Free forever'
                  : selectedPlanData.monthlyPrice === null
                    ? 'Custom pricing'
                    : billingCycle === 'yearly'
                      ? `₹${selectedPlanData.yearlyPrice}/yr`
                      : `₹${selectedPlanData.monthlyPrice}/mo`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedPlanData.features.filter(f => f.included).slice(0, 4).map((f, i) => (
                  <div key={i} className="premium-pricing-feature">
                    <CheckCircle2 size={16} />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="auth-features" style={{ marginTop: '24px' }}>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)' }}><Sparkles size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">AI Bug Generator</span>
                <span className="auth-feature-desc">Automatically generate titles and steps</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)' }}><Bug size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Smart QA Workflow</span>
                <span className="auth-feature-desc">Assign and track bugs efficiently</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.1)' }}><Code2 size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Developer Collaboration</span>
                <span className="auth-feature-desc">Seamlessly integrate with dev tools</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ color: 'var(--accent)', background: 'rgba(91, 108, 255, 0.1)' }}><CheckCircle2 size={16} /></div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Screenshot & Video Uploads</span>
                <span className="auth-feature-desc">Attach visual proofs instantly</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Section */}
        <div className="auth-right">
          <div className="auth-card" style={{ maxWidth: '520px', width: '100%', padding: '0 10px' }}>
            <h1 className="signup-title">Create workspace</h1>
            <p className="signup-subtitle">Join thousands of modern teams building better software.</p>

            <form onSubmit={handleSubmit} noValidate>

              {/* Billing Cycle Toggle */}
              <div style={{ opacity: (selectedPlanId === 'free' || selectedPlanId === 'enterprise') ? 0.5 : 1, pointerEvents: (selectedPlanId === 'free' || selectedPlanId === 'enterprise') ? 'none' : 'auto', transition: 'all 0.3s ease' }}>
                <div className="billing-toggle-wrapper">
                  <div className={`billing-slider ${billingCycle === 'yearly' ? 'yearly' : ''}`}></div>
                  <div
                    className={`billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('monthly')}
                  >
                    Monthly
                  </div>
                  <div
                    className={`billing-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('yearly')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    Yearly
                    <span style={{ fontSize: '11px', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: '10px' }}>Save 20%</span>
                  </div>
                </div>
              </div>

              {/* Plan Selection Grid */}
              <div className="plan-selection-grid">
                {Object.values(PLANS).map(p => (
                  <div
                    key={p.id}
                    className={`plan-card ${selectedPlanId === p.id ? 'active' : ''}`}
                    onClick={() => setSelectedPlanId(p.id)}
                  >
                    <div className="plan-card-name">{p.name}</div>
                    <div className="plan-card-price">
                      {p.monthlyPrice === 0
                        ? 'Free forever'
                        : p.monthlyPrice === null
                          ? 'Custom pricing'
                          : billingCycle === 'yearly'
                            ? `₹${p.yearlyPrice}/yr`
                            : `₹${p.monthlyPrice}/mo`}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Organization Name</label>
                  <div className="premium-input-wrapper">
                    <Building2 size={18} className="premium-input-icon" />
                    <input
                      type="text"
                      className={`premium-input ${fieldErrors.workspaceName ? 'error' : ''}`}
                      placeholder="Acme Corp"
                      value={form.workspaceName}
                      onChange={update('workspaceName')}
                    />
                  </div>
                  {fieldErrors.workspaceName && <div className="premium-error-text">{fieldErrors.workspaceName}</div>}
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">Owner Full Name</label>
                  <div className="premium-input-wrapper">
                    <User size={18} className="premium-input-icon" />
                    <input
                      type="text"
                      className={`premium-input ${fieldErrors.name ? 'error' : ''}`}
                      placeholder="Alex Johnson"
                      value={form.name}
                      onChange={update('name')}
                    />
                  </div>
                  {fieldErrors.name && <div className="premium-error-text">{fieldErrors.name}</div>}
                </div>
              </div>

              <div className="premium-input-group">
                <label className="premium-label">Work Email</label>
                <div className="premium-input-wrapper">
                  <Mail size={18} className="premium-input-icon" />
                  <input
                    type="email"
                    className={`premium-input ${fieldErrors.email ? 'error' : ''}`}
                    placeholder="alex@acme.com"
                    value={form.email}
                    onChange={update('email')}
                  />
                </div>
                {fieldErrors.email && <div className="premium-error-text">{fieldErrors.email}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="premium-input-group">
                  <label className="premium-label">Country</label>
                  <div className="premium-input-wrapper">
                    <Globe size={18} className="premium-input-icon" />
                    <select
                      className="premium-input"
                      value={form.country}
                      onChange={update('country')}
                      style={{ appearance: 'none' }}
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: '16px', pointerEvents: 'none', color: '#9CA3AF' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                  </div>
                </div>

                <div className="premium-input-group">
                  <label className="premium-label">GST Number <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(Optional)</span></label>
                  <div className="premium-input-wrapper">
                    <Receipt size={18} className="premium-input-icon" />
                    <input
                      type="text"
                      className={`premium-input ${fieldErrors.gstNumber ? 'error' : ''}`}
                      placeholder="22AAAAA0000A1Z5"
                      value={form.gstNumber}
                      onChange={update('gstNumber')}
                      maxLength={15}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  {fieldErrors.gstNumber && <div className="premium-error-text">{fieldErrors.gstNumber}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="premium-input-group" style={{ marginBottom: 12 }}>
                  <label className="premium-label">Password</label>
                  <div className="premium-input-wrapper">
                    <Lock size={18} className="premium-input-icon" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className={`premium-input ${fieldErrors.password ? 'error' : ''}`}
                      placeholder="Min 8 characters"
                      value={form.password}
                      onChange={update('password')}
                      style={{ paddingRight: '40px' }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1} style={{ position: 'absolute', right: '14px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="pwd-strength-container">
                      {[...Array(5)].map((_, i) => {
                        let strengthClass = '';
                        if (i < passStrength.score) {
                          if (passStrength.score >= 4) strengthClass = 'strong';
                          else if (passStrength.score >= 2) strengthClass = 'fair';
                          else strengthClass = 'weak';
                        }
                        return <div key={i} className={`pwd-strength-bar ${i < passStrength.score ? 'filled ' + strengthClass : ''}`}></div>;
                      })}
                    </div>
                  )}
                  {fieldErrors.password && <div className="premium-error-text" style={{ marginTop: '10px' }}>{fieldErrors.password}</div>}
                </div>

                <div className="premium-input-group" style={{ marginBottom: 12 }}>
                  <label className="premium-label">Confirm Password</label>
                  <div className="premium-input-wrapper">
                    <Lock size={18} className="premium-input-icon" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className={`premium-input ${fieldErrors.confirm ? 'error' : ''}`}
                      placeholder="Repeat password"
                      value={form.confirm}
                      onChange={update('confirm')}
                      style={{ paddingRight: '40px' }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1} style={{ position: 'absolute', right: '14px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.confirm && <div className="premium-error-text">{fieldErrors.confirm}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={form.terms}
                  onChange={update('terms')}
                  style={{ width: '16px', height: '16px', accentColor: '#111827', cursor: 'pointer' }}
                />
                <label htmlFor="terms" style={{ fontSize: '13px', color: '#4B5563', cursor: 'pointer' }}>
                  I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#5b6cff', fontWeight: 500 }}>Terms of Service</Link> and <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#5b6cff', fontWeight: 500 }}>Privacy Policy</Link>
                </label>
              </div>
              {fieldErrors.terms && <div className="premium-error-text" style={{ marginTop: '8px' }}>{fieldErrors.terms}</div>}

              <button type="submit" className="premium-submit-btn" disabled={loading}>
                {loading ? <Loader2 size={18} className="spin" /> : null}
                {loading ? 'Creating Workspace...' : 'Create Workspace'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="premium-auth-footer">
              Already have an account? <Link to="/login">Sign in to your workspace</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
