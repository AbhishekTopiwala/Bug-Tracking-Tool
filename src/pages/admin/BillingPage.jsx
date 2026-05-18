import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import './BillingPage.css';

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    features: [
      'Up to 3 Projects',
      '100 AI Generations / mo',
      'Basic Reporting',
      'Standard Support'
    ],
    limit: 100
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1999,
    features: [
      'Unlimited Projects',
      '1,000 AI Generations / mo',
      'Advanced Analytics',
      'Priority Support',
      'Custom Branding'
    ],
    limit: 1000,
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    features: [
      'Unlimited Everything',
      '10,000 AI Generations / mo',
      'SLA Guarantee',
      'Dedicated Manager',
      'SSO Integration'
    ],
    limit: 10000
  }
];

const BillingPage = () => {
  const { userProfile, branding } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    if (!userProfile?.organizationId) return;

    const unsub = onSnapshot(doc(db, 'organizations', userProfile.organizationId), (snap) => {
      if (snap.exists()) {
        setOrganization(snap.data());
      }
      setLoading(false);
    });

    return () => unsub();
  }, [userProfile?.organizationId]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (plan) => {
    if (plan.id === organization?.subscription?.planId) {
      toast.error('You are already on this plan');
      return;
    }

    if (plan.price === 0) {
      // Downgrade to free or initial state logic
      toast.success('Switched to Starter plan');
      return;
    }

    setProcessingPlan(plan.id);
    const res = await loadRazorpay();

    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      setProcessingPlan(null);
      return;
    }

    // In a real production app, we would call a Cloud Function here to create an Order
    // and get an order_id. For this demonstration, we'll simulate the payment flow.
    
    const options = {
      key: "rzp_test_YOUR_KEY_ID", // Replace with actual Key ID
      amount: plan.price * 100,
      currency: "INR",
      name: "Qualia SaaS",
      description: `Upgrade to ${plan.name} Plan`,
      image: branding.logoUrl || "https://firebasestorage.googleapis.com/v0/b/demo2-659f2.firebasestorage.app/o/branding%2Fqualia_logo.png?alt=media",
      handler: async function (response) {
        // This would normally be handled via Webhook, but for demo UI feedback:
        try {
          await updateDoc(doc(db, 'organizations', userProfile.organizationId), {
            'subscription.planId': plan.id,
            'subscription.status': 'active',
            'subscription.lastPaymentId': response.razorpay_payment_id,
            'aiUsage.monthlyLimit': plan.limit
          });
          toast.success(`Welcome to ${plan.name}! Your plan has been upgraded.`);
        } catch (error) {
          console.error("Upgrade error:", error);
          toast.error("Payment successful but failed to update subscription. Contact support.");
        }
      },
      prefill: {
        name: userProfile.displayName,
        email: userProfile.email,
      },
      theme: {
        color: branding.primaryColor || "#6366f1",
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
    setProcessingPlan(null);
  };

  if (loading) {
    return <div className="billing-loading">Loading subscription details...</div>;
  }

  const currentPlan = PLANS.find(p => p.id === (organization?.subscription?.planId || 'free'));
  const usagePercent = organization?.aiUsage 
    ? Math.min(100, (organization.aiUsage.currentUsage / organization.aiUsage.monthlyLimit) * 100)
    : 0;

  return (
    <div className="billing-container">
      <div className="billing-header">
        <div className="header-content">
          <h1>Subscription & Billing</h1>
          <p>Manage your organization's plan and AI resource usage</p>
        </div>
        <div className="billing-badge">
          <ShieldCheck size={18} />
          <span>Secure Billing by Razorpay</span>
        </div>
      </div>

      <div className="billing-grid">
        {/* Current Plan Summary */}
        <div className="billing-card current-plan-card">
          <div className="card-header">
            <h3>Current Subscription</h3>
            <span className="plan-status active">Active</span>
          </div>
          <div className="plan-info">
            <div className="plan-name-large">
              <Zap className="plan-icon" />
              {currentPlan.name}
            </div>
            <p className="plan-price-info">
              {currentPlan.price > 0 ? `₹${currentPlan.price}/month` : 'Free Forever'}
            </p>
          </div>
          <div className="plan-divider" />
          <div className="usage-section">
            <div className="usage-header">
              <span>AI Quota Usage</span>
              <span>{organization?.aiUsage?.currentUsage || 0} / {organization?.aiUsage?.monthlyLimit || 100}</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent > 90 ? '#ef4444' : branding.primaryColor 
                }} 
              />
            </div>
            <p className="usage-footer">
              Resets on the 1st of next month
            </p>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="plans-selection-grid">
          {PLANS.map((plan) => (
            <div 
              key={plan.id} 
              className={`plan-card ${plan.popular ? 'popular' : ''} ${plan.id === currentPlan.id ? 'current' : ''}`}
            >
              {plan.popular && <div className="popular-tag">Most Popular</div>}
              <h4>{plan.name}</h4>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">{plan.price}</span>
                <span className="period">/mo</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <CheckCircle2 size={16} className="feature-icon" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                className={`plan-button ${plan.id === currentPlan.id ? 'secondary' : 'primary'}`}
                onClick={() => handleUpgrade(plan)}
                disabled={processingPlan === plan.id || plan.id === currentPlan.id}
                style={{ 
                  backgroundColor: plan.id === currentPlan.id ? 'transparent' : branding.primaryColor,
                  borderColor: branding.primaryColor,
                  color: plan.id === currentPlan.id ? branding.primaryColor : '#fff'
                }}
              >
                {processingPlan === plan.id ? 'Processing...' : plan.id === currentPlan.id ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="billing-footer-info">
        <div className="info-item">
          <BarChart3 size={20} />
          <div>
            <h5>Detailed Invoices</h5>
            <p>Download monthly GST compliant invoices from your history.</p>
          </div>
        </div>
        <div className="info-item">
          <RefreshCcw size={20} />
          <div>
            <h5>Cancel Anytime</h5>
            <p>No long term contracts. Downgrade or cancel with one click.</p>
          </div>
        </div>
        <div className="info-item">
          <Sparkles size={20} />
          <div>
            <h5>Need Custom Quota?</h5>
            <p>Contact our sales team for higher AI generation limits.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
