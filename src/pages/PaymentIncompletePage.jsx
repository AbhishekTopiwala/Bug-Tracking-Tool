import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  PLANS, PAYMENT_STATUS, formatPrice, saveSelectedPlan,
  getPendingPaymentSession, getSelectedPlan, needsPayment
} from '../services/paymentService';
import {
  AlertTriangle, CreditCard, RefreshCw, LogOut,
  MessageCircle, ChevronRight, HelpCircle, FileText,
  Clock, Shield, Check, ExternalLink, Zap, Users,
  Folder, X, ArrowRight
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const FAQ_ITEMS = [
  {
    q: 'Why is my payment pending?',
    a: 'Your payment was not completed. This can happen if you closed the payment window or your bank declined the transaction. Click "Retry Payment" to try again.'
  },
  {
    q: 'Will I be charged twice if I retry?',
    a: 'No. Each payment attempt creates a new secure order. You are only charged once on a successful transaction. All duplicate orders are automatically voided.'
  },
  {
    q: 'Can I change my plan?',
    a: 'Yes! Click "Change Plan" below to go back to our pricing page and select a different plan that fits your team size and budget.'
  },
  {
    q: 'What if my payment fails again?',
    a: 'Try a different payment method or bank. If the issue persists, contact our support team at support@qualia.app and we will assist you directly.'
  },
];

export default function PaymentIncompletePage() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [planDetails, setPlanDetails] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    // If user somehow has a paid subscription, redirect them to dashboard
    if (userProfile.paymentStatus === PAYMENT_STATUS.PAID) {
      navigate('/admin', { replace: true });
      return;
    }

    // Load the plan they were trying to purchase
    const pendingPlanId = userProfile.pendingPlanId || userProfile.planId;
    if (pendingPlanId && PLANS[pendingPlanId]) {
      setPlanDetails(PLANS[pendingPlanId]);
    }
  }, [currentUser, userProfile, navigate]);

  const handleRetryPayment = () => {
    const planId = userProfile?.pendingPlanId || userProfile?.planId;
    const billingCycle = userProfile?.pendingBillingCycle || 'monthly';

    if (planId && PLANS[planId]) {
      saveSelectedPlan(planId, billingCycle);
      navigate('/payment', { state: { planId, billingCycle } });
    } else {
      navigate('/#pricing');
    }
  };

  const handleChangePlan = () => {
    navigate('/#pricing');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch {
      toast.error('Failed to logout. Try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  // Determine status message
  const payStatus = userProfile?.paymentStatus;
  const isFailed = payStatus === PAYMENT_STATUS.FAILED;
  const isCancelled = payStatus === PAYMENT_STATUS.CANCELLED;
  const isExpired = payStatus === PAYMENT_STATUS.EXPIRED;
  const isPending = payStatus === PAYMENT_STATUS.PENDING;

  const statusConfig = {
    [PAYMENT_STATUS.FAILED]: {
      icon: <AlertTriangle size={22} style={{ color: '#ef4444' }} />,
      title: 'Payment Failed',
      description: 'Your payment could not be processed. This may be due to a declined card, network issue, or bank restriction.',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.08)',
    },
    [PAYMENT_STATUS.CANCELLED]: {
      icon: <X size={22} style={{ color: '#f59e0b' }} />,
      title: 'Payment Cancelled',
      description: 'You closed the payment window before completing the transaction. Your account is ready — just complete payment to unlock your workspace.',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
    },
    [PAYMENT_STATUS.PENDING]: {
      icon: <Clock size={22} style={{ color: '#6366f1' }} />,
      title: 'Payment Pending',
      description: 'Your payment is pending or has not been completed yet. Please complete your payment to activate your workspace.',
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.08)',
    },
    [PAYMENT_STATUS.EXPIRED]: {
      icon: <Clock size={22} style={{ color: '#94a3b8' }} />,
      title: 'Payment Session Expired',
      description: 'Your payment session has expired. Please start a new payment to proceed.',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.08)',
    },
  };

  const status = statusConfig[payStatus] || statusConfig[PAYMENT_STATUS.PENDING];

  return (
    <div className="payment-incomplete-page">
      {/* Top Alert Banner */}
      <div className="payment-incomplete-banner" style={{ background: status.bg, borderBottom: `2px solid ${status.color}` }}>
        <div className="banner-inner">
          {status.icon}
          <span style={{ color: status.color, fontWeight: 700 }}>
            {status.title} — Complete payment to unlock your workspace
          </span>
        </div>
      </div>

      <div className="pi-layout">
        {/* Left: Status + Actions */}
        <div className="pi-main">
          {/* Header */}
          <div className="pi-header">
            <div className="pi-logo">
              <div className="pi-logo-icon">Q</div>
              <span className="pi-logo-text">Qualia</span>
            </div>
            <button onClick={handleLogout} className="pi-logout-btn" disabled={loggingOut}>
              <LogOut size={15} />
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>

          {/* Main Status Card */}
          <div className="pi-status-card">
            <div className="pi-status-icon" style={{ background: status.bg, border: `1px solid ${status.color}33` }}>
              {status.icon}
            </div>
            <div>
              <h1 className="pi-status-title">{status.title}</h1>
              <p className="pi-status-desc">{status.description}</p>
            </div>
          </div>

          {/* Locked Features Warning */}
          <div className="pi-locked-warning">
            <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <div className="pi-locked-title">Features locked until payment is complete</div>
              <div className="pi-locked-list">
                <span>Projects</span>
                <span>Bug Tracker</span>
                <span>Team Members</span>
                <span>AI Generator</span>
                <span>Reports</span>
                <span>Settings</span>
              </div>
            </div>
          </div>

          {/* Plan Summary */}
          {planDetails && (
            <div className="pi-plan-summary">
              <div className="pi-plan-header">
                <div>
                  <div className="pi-plan-name">{planDetails.name}</div>
                  <div className="pi-plan-tagline">{planDetails.tagline}</div>
                </div>
                <div className="pi-plan-price">
                  {planDetails.monthlyPrice === 0 ? 'Free' : formatPrice(planDetails.monthlyPrice)}
                  {planDetails.monthlyPrice > 0 && <span className="pi-plan-period">/mo</span>}
                </div>
              </div>
              <div className="pi-plan-features">
                {planDetails.features.filter(f => f.included).slice(0, 4).map((f, i) => (
                  <div key={i} className="pi-feature-row">
                    <Check size={13} style={{ color: '#22c55e' }} />
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pi-actions">
            <button
              id="retry-payment-btn"
              className="pi-btn-primary"
              onClick={handleRetryPayment}
            >
              <CreditCard size={18} />
              Retry Payment
              <ArrowRight size={16} />
            </button>

            <button
              className="pi-btn-secondary"
              onClick={handleChangePlan}
            >
              <RefreshCw size={15} />
              Change Plan
            </button>

            <a
              href="mailto:support@qualia.app?subject=Payment Help - Qualia"
              className="pi-btn-ghost"
            >
              <MessageCircle size={15} />
              Contact Support
            </a>
          </div>

          {/* Security note */}
          <div className="pi-security-note">
            <Shield size={14} />
            <span>Payments are secured by Razorpay · PCI DSS Level 1 Certified</span>
          </div>
        </div>

        {/* Right: FAQ + Help */}
        <div className="pi-sidebar">
          <div className="pi-sidebar-section">
            <div className="pi-sidebar-title">
              <HelpCircle size={16} />
              Frequently Asked Questions
            </div>
            <div className="pi-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={`pi-faq-item ${openFaq === i ? 'open' : ''}`}>
                  <button
                    className="pi-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{item.q}</span>
                    <ChevronRight
                      size={15}
                      style={{ transform: openFaq === i ? 'rotate(90deg)' : 'none', transition: '0.2s' }}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="pi-faq-answer">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pi-sidebar-section">
            <div className="pi-sidebar-title">
              <MessageCircle size={16} />
              Need Help?
            </div>
            <div className="pi-help-options">
              <a href="mailto:support@qualia.app" className="pi-help-link">
                <div className="pi-help-link-icon">✉️</div>
                <div>
                  <div className="pi-help-link-title">Email Support</div>
                  <div className="pi-help-link-sub">support@qualia.app</div>
                </div>
                <ExternalLink size={13} />
              </a>
              <a href="#" className="pi-help-link">
                <div className="pi-help-link-icon">📖</div>
                <div>
                  <div className="pi-help-link-title">Documentation</div>
                  <div className="pi-help-link-sub">docs.qualia.app</div>
                </div>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div className="pi-trusted-note">
            <Shield size={14} style={{ color: '#22c55e' }} />
            <span>Your account and data are safe. Payment is required only to unlock the workspace.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
