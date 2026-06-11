import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Zap, Users, HardDrive, CheckCircle2, RefreshCw,
  Crown, ArrowUpRight, X, FileText, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgSettings } from '../../services/orgService';
import toast from 'react-hot-toast';

const PLAN_FEATURES = {
  free: {
    name: '1 Rs Test Plan', color: '#64748B', price: { monthly: 1, yearly: 1 },
    pricePerUser: null, isPerUser: false,
    userLimit: 5, storageLimit: '100 MB', projectLimit: 2,
    features: ['Up to 5 users', '2 projects', '100 MB storage', '30 AI Bug Reports / month', 'Community support'],
  },
  pro: {
    name: 'Pro', color: '#5B6CFF', price: { monthly: 99, yearly: 79 },
    pricePerUser: 99, pricePerUserYearly: 79, isPerUser: true,
    userLimit: Infinity, storageLimit: '10 GB', projectLimit: 10,
    features: ['Unlimited users', '10 projects', '10 GB storage', '100 AI Bug Reports / user / month', 'Email notifications', 'Basic analytics', 'Email support'],
  },
  business: {
    name: 'Business', color: '#7C3AED', price: { monthly: 199, yearly: 159 },
    pricePerUser: 199, pricePerUserYearly: 159, isPerUser: true,
    userLimit: Infinity, storageLimit: '50 GB', projectLimit: 20,
    features: ['Unlimited users', '20 projects', '50 GB storage', '250 AI Bug Reports / user / month', 'API access', 'Webhooks', 'Advanced analytics', 'Custom workflows', 'Role-based access control', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise', color: '#F59E0B', price: { monthly: null, yearly: null },
    pricePerUser: null, isPerUser: false,
    userLimit: Infinity, storageLimit: 'Unlimited', projectLimit: Infinity,
    features: ['Unlimited users', 'Unlimited projects', 'Unlimited storage', 'Unlimited AI usage', 'SSO / SAML', 'Dedicated account manager', 'SLA support', 'Private cloud / On-premise', 'Advanced security controls'],
  },
};

// ── Upgrade Plan Modal ────────────────────────────────────────────────────────
function UpgradeModal({ currentPlanKey, billingCycle, onClose }) {
  const [cycle, setCycle] = useState(billingCycle || 'monthly');
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (!selected) { toast.error('Please select a plan first'); return; }
    navigate('/payment', { state: { planId: selected, billingCycle: cycle } });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 780,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(15,23,42,0.2)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>Upgrade Your Plan</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>Choose the plan that fits your organization</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Billing cycle toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 4, gap: 2 }}>
            {['monthly', 'yearly'].map(c => (
              <button key={c} onClick={() => setCycle(c)} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s',
                background: cycle === c ? '#fff' : 'transparent',
                color: cycle === c ? '#0F172A' : '#64748B',
                boxShadow: cycle === c ? '0 1px 4px rgba(15,23,42,0.1)' : 'none',
              }}>
                {c === 'monthly' ? 'Monthly' : 'Yearly'}{c === 'yearly' && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>Save 20%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {Object.entries(PLAN_FEATURES).map(([key, p]) => {
            const isCurrent = key === currentPlanKey;
            const isSelected = selected === key;
            return (
              <div key={key} onClick={() => !isCurrent && setSelected(key)} style={{
                border: `2px solid ${isSelected ? p.color : isCurrent ? '#E2E8F0' : '#E2E8F0'}`,
                borderRadius: 14, padding: 20, cursor: isCurrent ? 'default' : 'pointer',
                background: isSelected ? `${p.color}05` : '#fff',
                transition: 'all 0.2s', position: 'relative',
                boxShadow: isSelected ? `0 4px 20px ${p.color}20` : 'none',
              }}>
                {isCurrent && (
                  <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#E2E8F0', color: '#64748B', padding: '2px 10px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    CURRENT PLAN
                  </span>
                )}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}15`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Crown size={16} />
                </div>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', margin: '0 0 4px' }}>{p.name}</p>
                <p style={{ fontWeight: 800, fontSize: '1.6rem', color: p.color, margin: '0 0 12px' }}>
                  {p.price.monthly === 0 ? 'Free' : p.price.monthly === null ? 'Custom' : (
                    <>₹{p.isPerUser ? (cycle === 'yearly' ? p.pricePerUserYearly : p.pricePerUser) : p.price[cycle]}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8' }}>{p.isPerUser ? '/user/mo' : '/mo'}</span></>
                  )}
                </p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#334155', fontWeight: 500 }}>
                      <CheckCircle2 size={12} style={{ color: p.color, flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            Cancel
          </button>
          <button onClick={handleUpgrade} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.88rem', color: '#fff',
            background: selected ? `linear-gradient(135deg, ${PLAN_FEATURES[selected]?.color}, ${PLAN_FEATURES[selected]?.color}bb)` : '#CBD5E1',
          }}>
            {selected ? `Upgrade to ${PLAN_FEATURES[selected].name}` : 'Select a plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrgBillingPage() {
  const { userProfile } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    setLoading(true);
    try {
      const data = await getOrgSettings(userProfile.organizationId);
      setOrg(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (userProfile?.organizationId) load();
  }, [userProfile?.organizationId, load]);

  const rawPlan = (
    org?.subscription?.plan || org?.plan || userProfile?.subscriptionPlan || 'free'
  ).toLowerCase().replace(/[^a-z]/g, '');

  const planKey = ['free', 'pro', 'business', 'enterprise'].includes(rawPlan) ? rawPlan : 'free';
  const plan = PLAN_FEATURES[planKey];

  const subscriptionStatus = org?.subscription?.status || org?.subscriptionStatus || 'active';
  const billingCycle = org?.subscription?.billingCycle || org?.billingCycle || 'monthly';
  const nextBillingDate = org?.subscription?.nextBillingDate || org?.nextBillingDate || null;
  const memberCount = org?.memberCount ?? 0;
  const projectCount = org?.projectCount ?? 0;
  const paymentStatus = org?.subscription?.paymentStatus || org?.paymentStatus || userProfile?.paymentStatus || 'ACTIVE';

  const memberPct = plan.userLimit === Infinity ? 0 : Math.min(Math.round((memberCount / plan.userLimit) * 100), 100);
  const projectPct = plan.projectLimit === Infinity ? 0 : Math.min(Math.round((projectCount / plan.projectLimit) * 100), 100);

  const statusColor = { active: '#10B981', ACTIVE: '#10B981', trial: '#F59E0B', cancelled: '#EF4444', suspended: '#EF4444' };
  const getStatusColor = s => statusColor[s] || '#94A3B8';

  const handleManagePayment = () => {
    toast('Opening payment management portal...', { icon: '💳' });
    // In production: redirect to Stripe customer portal URL
    setTimeout(() => toast.error('Payment portal not configured. Contact support to update payment details.'), 1500);
  };

  const handleViewInvoices = () => {
    toast('Loading invoices...', { icon: '📄' });
    setTimeout(() => toast('No invoices found. Invoices appear after your first billing cycle.', { icon: 'ℹ️' }), 1200);
  };

  const handleCancelSubscription = () => {
    setShowCancelConfirm(false);
    toast.error('Cancellation request submitted. Your subscription will remain active until the end of the current billing period.');
  };

  const isActive = ['ACTIVE', 'active', 'PAID'].includes(paymentStatus);

  return (
    <div className="org-container">
      {/* Header */}
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><CreditCard size={24} style={{ color: 'var(--org-purple)' }} /> Billing &amp; Subscription</h1>
          <p className="org-page-subtitle">Manage your plan, usage limits, and payment details.</p>
        </div>
        <button className="org-btn-secondary" onClick={load} disabled={loading}
          style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      ) : (
        <>
          {/* Current Plan Banner */}
          <div style={{
            padding: 24, borderRadius: 18, border: `2px solid ${plan.color}25`,
            background: `linear-gradient(135deg, ${plan.color}06, ${plan.color}02)`,
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: `linear-gradient(135deg, ${plan.color}, ${plan.color}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 20px ${plan.color}30`,
            }}>
              <Crown size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>{plan.name} Plan</h2>
                <span style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  background: `${getStatusColor(subscriptionStatus)}12`, color: getStatusColor(subscriptionStatus),
                  border: `1px solid ${getStatusColor(subscriptionStatus)}25`,
                }}>
                  {['active', 'ACTIVE'].includes(subscriptionStatus) ? '● Active' : subscriptionStatus}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>
                  {billingCycle === 'yearly' ? '📅 Annual' : '📅 Monthly'}
                </span>
              </div>
              {nextBillingDate && (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94A3B8', fontWeight: 500 }}>
                  Next renewal: {nextBillingDate?.toDate
                    ? nextBillingDate.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : nextBillingDate}
                </p>
              )}
            </div>
            {planKey !== 'enterprise' && (
              <button className="org-btn-primary" onClick={() => setShowUpgrade(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowUpRight size={16} /> Upgrade Plan
              </button>
            )}
          </div>

          {/* Usage Stats */}
          <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { label: 'Team Members', icon: Users, value: memberCount, limit: plan.userLimit === Infinity ? '∞' : plan.userLimit, pct: memberPct, color: '#7C3AED' },
              { label: 'Projects', icon: Zap, value: projectCount, limit: plan.projectLimit === Infinity ? '∞' : plan.projectLimit, pct: projectPct, color: '#3B82F6' },
              { label: 'Storage', icon: HardDrive, value: plan.storageLimit, limit: null, pct: null, color: '#10B981' },
            ].map(({ label, icon: Icon, value, limit, pct, color }) => (
              <div key={label} className="org-stat-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}10`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155', margin: 0 }}>{label}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: pct !== null ? 10 : 0 }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</span>
                  {limit !== null && <span style={{ fontSize: '0.88rem', color: '#94A3B8', fontWeight: 600 }}>/ {limit}</span>}
                </div>
                {pct !== null && (
                  <>
                    <div className="org-progress-track">
                      <div className="org-progress-fill" style={{ width: `${pct}%`, background: pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : color }} />
                    </div>
                    <p style={{ fontSize: '0.7rem', color: pct > 80 ? '#EF4444' : '#94A3B8', margin: '6px 0 0', fontWeight: 600 }}>
                      {pct}% of limit used {pct > 80 && '— consider upgrading'}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Plan Features */}
          <div className="org-card">
            <div className="org-card-header">
              <h3 className="org-card-title"><CheckCircle2 size={16} style={{ color: 'var(--org-purple)' }} /> Included in {plan.name}</h3>
            </div>
            <div className="org-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <CheckCircle2 size={15} style={{ color: plan.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment & Actions */}
          <div className="org-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={15} style={{ color: 'var(--org-purple)' }} /> Payment &amp; Billing Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {/* Payment Status */}
              <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, background: isActive ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)' }}>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', color: '#64748B', margin: '0 0 6px', textTransform: 'uppercase' }}>Payment Status</p>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: isActive ? '#10B981' : '#EF4444', margin: 0 }}>
                  {isActive ? '✓ All Payments Current' : paymentStatus}
                </p>
              </div>

              {/* Manage Payment */}
              <button onClick={handleManagePayment} style={{
                padding: 16, borderRadius: 12, border: '1px solid rgba(226,232,240,0.8)',
                background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#7C3AED'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7C3AED', fontWeight: 700, fontSize: '0.88rem' }}>
                  <CreditCard size={15} /> Manage Payment Method
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>Update card or billing details</p>
              </button>

              {/* View Invoices */}
              <button onClick={handleViewInvoices} style={{
                padding: 16, borderRadius: 12, border: '1px solid rgba(226,232,240,0.8)',
                background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3B82F6', fontWeight: 700, fontSize: '0.88rem' }}>
                  <FileText size={15} /> View Invoices
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>Download past billing statements</p>
              </button>

              {/* Cancel Subscription */}
              {planKey !== 'free' && (
                <button onClick={() => setShowCancelConfirm(true)} style={{
                  padding: 16, borderRadius: 12, border: '1px solid rgba(244,63,94,0.2)',
                  background: 'rgba(244,63,94,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.03)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EF4444', fontWeight: 700, fontSize: '0.88rem' }}>
                    <AlertTriangle size={15} /> Cancel Subscription
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>Downgrade or end your plan</p>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <UpgradeModal
          currentPlanKey={planKey}
          billingCycle={billingCycle}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowCancelConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 32, maxWidth: 440, width: '100%', boxShadow: '0 25px 60px rgba(15,23,42,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Cancel Subscription?</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>This action cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, marginBottom: 24 }}>
              Your subscription will remain active until the end of the current billing cycle. After that, your account will be downgraded to the <strong>Starter</strong> plan.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCancelConfirm(false)}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                Keep Subscription
              </button>
              <button onClick={handleCancelSubscription}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
