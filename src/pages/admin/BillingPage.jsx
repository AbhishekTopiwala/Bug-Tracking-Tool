import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, functions } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  CreditCard, CheckCircle2, Zap, ShieldCheck, BarChart3, RefreshCcw,
  Sparkles, Users, FolderGit2, Calendar, FileText, AlertCircle, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { getUserPaymentHistory, formatPrice, PLANS } from '../../services/paymentService';

import './BillingPage.css';


const BillingPage = () => {
  const { userProfile, branding } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const limits = usePlanLimits();

  useEffect(() => {
    if (!userProfile?.organizationId) return;

    const unsub = onSnapshot(doc(db, 'organizations', userProfile.organizationId), (snap) => {
      if (snap.exists()) {
        setOrganization(snap.data());
      }
      setLoadingOrg(false);
    });

    return () => unsub();
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const fetchHistory = async () => {
      try {
        const history = await getUserPaymentHistory(userProfile.uid);
        setPaymentHistory(history);
      } catch (error) {
        console.error("Failed to fetch payment history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [userProfile?.uid]);

  const navigate = useNavigate();

  const handleUpgrade = async (plan) => {
    const currentPlanId = organization?.subscription?.plan || organization?.subscription?.planId;
    if (plan.id === currentPlanId) {
      toast.error('You are already on this plan');
      return;
    }

    if (plan.monthlyPrice === 0) {
      setShowCancelModal(true);
      return;
    }

    navigate('/payment', { state: { planId: plan.id, billingCycle: 'monthly' } });
  };

  const handleDowngradeToFree = async () => {
    try {
      toast.loading("Downgrading subscription...", { id: "downgrade-toast" });
      const activateFreePlanCF = httpsCallable(functions, 'activateFreePlan');
      await activateFreePlanCF();
      toast.success('Successfully downgraded to Free plan', { id: "downgrade-toast" });
      setShowCancelModal(false);
    } catch (error) {
      console.error("Downgrade error:", error);
      toast.error("Failed to downgrade. Please try again.", { id: "downgrade-toast" });
    }
  };

  if (loadingOrg || limits.loadingLimits) {
    return <div className="billing-loading">Loading subscription details...</div>;
  }

  const currentPlanId = organization?.subscription?.plan || organization?.subscription?.planId || 'free';
  const currentPlan = PLANS[currentPlanId] || PLANS.free;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDaysRemaining = (renewsAt) => {
    if (!renewsAt) return null;
    const renewDate = new Date(renewsAt);
    const today = new Date();
    const diffTime = renewDate - today;
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAvailableUpgradePlans = () => {
    const activePlans = Object.values(PLANS).filter(p => p.active);
    return activePlans.filter(p => p.id !== 'free' && p.id !== currentPlan.id);
  };

  const upgradePlans = getAvailableUpgradePlans();

  const handleDownloadInvoice = (payment) => {
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${payment.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 800; color: #5b6cff; display: flex; align-items: center; gap: 8px; }
            .invoice-details { text-align: right; }
            .invoice-title { font-size: 32px; font-weight: 800; margin: 0; color: #0f172a; letter-spacing: -0.02em; }
            .bill-to { margin-bottom: 40px; padding: 24px; background: #f8fafc; border-radius: 12px; }
            .bill-to h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 12px 0; }
            .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            .table th, .table td { padding: 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f8fafc; font-weight: 600; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
            .total-row { font-weight: 800; font-size: 1.25rem; color: #0f172a; }
            .footer { margin-top: 80px; font-size: 0.875rem; color: #64748b; text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Qualia SaaS</div>
              <p style="margin-top: 8px; color: #64748b; font-size: 14px;">
                123 Innovation Drive<br/>
                San Francisco, CA 94105<br/>
                United States
              </p>
            </div>
            <div class="invoice-details">
              <h1 class="invoice-title">INVOICE</h1>
              <p style="margin-top: 12px; color: #64748b; font-size: 14px;">
                Invoice #: INV-${payment.id?.slice(-8).toUpperCase() || 'NA'}<br/>
                Date: ${formatTimestamp(payment.createdAt)}<br/>
                Status: <strong style="color: #10b981;">PAID</strong>
              </p>
            </div>
          </div>
          
          <div class="bill-to">
            <h3>Bill To</h3>
            <p style="font-size: 16px; margin: 0;">
              <strong style="color: #0f172a; font-size: 18px;">${userProfile.displayName || 'Customer'}</strong><br/>
              ${userProfile.email}<br/>
              <span style="color: #64748b; font-size: 14px;">Organization ID: ${userProfile.organizationId || 'N/A'}</span>
            </p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style="color: #0f172a;">Premium Plan Subscription</strong><br/>
                  <span style="color: #64748b; font-size: 14px;">Processed securely via Razorpay</span>
                </td>
                <td style="text-align: right; font-weight: 500;">${formatPrice(payment.amount)}</td>
              </tr>
              <tr class="total-row">
                <td style="text-align: right; padding-top: 24px;">Total Paid (INR):</td>
                <td style="text-align: right; padding-top: 24px;">${formatPrice(payment.amount)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Thank you for your business. For any questions, please contact support@qualia.app</p>
          </div>
          <script>
            window.onload = function() { setTimeout(() => { window.print(); }, 500); }
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="billing-container">

      {/* 1. Header */}
      <div className="billing-header">
        <div className="header-content">
          <h1>Subscription & Billing</h1>
          <p>Manage your organization's plan, usage, and billing history</p>
        </div>
        <div className="billing-badge">
          <ShieldCheck size={18} />
          <span>Secure Billing by Razorpay</span>
        </div>
      </div>

      {/* 2. Usage Overview */}
      <div className="usage-dashboard">
        <div className="usage-card">
          <div className="usage-card-header">
            <div className="usage-icon-wrapper projects-icon">
              <FolderGit2 size={20} />
            </div>
            <h4>Projects Used</h4>
          </div>
          <div className="usage-metrics">
            <div className="usage-numbers">
              <span className="current">{limits.projectCount}</span>
            </div>
          </div>
          <div className="usage-progress-container">
            <div className="usage-progress">
              <div
                className="progress-fill projects-fill"
                style={{ width: `${limits.projectUsagePct}%` }}
              />
            </div>
            <div className="usage-limit-text">
              {limits.projectCount} of {limits.isUnlimitedProjects ? '∞' : limits.maxProjects} limit
            </div>
          </div>
        </div>

        <div className="usage-card">
          <div className="usage-card-header">
            <div className="usage-icon-wrapper team-icon">
              <Users size={20} />
            </div>
            <h4>Team Members</h4>
          </div>
          <div className="usage-metrics">
            <div className="usage-numbers">
              <span className="current">{limits.userCount}</span>
            </div>
          </div>
          <div className="usage-progress-container">
            <div className="usage-progress">
              <div
                className="progress-fill team-fill"
                style={{ width: `${limits.userUsagePct}%` }}
              />
            </div>
            <div className="usage-limit-text">
              {limits.userCount} of {limits.isUnlimitedUsers ? '∞' : limits.maxUsers} limit
            </div>
          </div>
        </div>

        <div className="usage-card">
          <div className="usage-card-header">
            <div className="usage-icon-wrapper ai-icon">
              <Sparkles size={20} />
            </div>
            <h4>AI Credits</h4>
          </div>
          <div className="usage-metrics">
            <div className="usage-numbers">
              <span className="current">{limits.aiUsed}</span>
            </div>
          </div>
          <div className="usage-progress-container">
            <div className="usage-progress">
              <div
                className="progress-fill ai-fill"
                style={{
                  width: `${limits.aiUsagePct}%`,
                  backgroundColor: limits.aiUsagePct > 90 ? '#ef4444' : undefined
                }}
              />
            </div>
            <div className="usage-limit-text">
              {limits.aiUsed} of {limits.isUnlimitedAI ? '∞' : limits.aiQuota} limit
            </div>
          </div>
        </div>
      </div>

      {/* 3. Subscription & Upgrade Grid */}
      <div className={`billing-grid ${upgradePlans.length === 0 ? 'single-column' : ''}`}>

        {/* Current Plan Summary */}
        <div className="billing-sidebar">
          <div className="billing-card current-plan-card">
            <div className="card-header">
              <h3>Current Subscription</h3>
              <span className={`plan-status ${organization?.subscription?.status === 'active' ? 'active' : 'inactive'}`}>
                {organization?.subscription?.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="detailed-plan-info">
              <div className="info-row">
                <span className="info-label">Plan</span>
                <span className="info-value plan-name-highlight">
                  <Zap size={16} /> {currentPlan.name}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Billing Cycle</span>
                <span className="info-value">Monthly</span>
              </div>
              <div className="info-row">
                <span className="info-label">Price</span>
                <span className="info-value">{currentPlan.monthlyPrice > 0 ? `₹${currentPlan.monthlyPrice}/month` : 'Free'}</span>
              </div>
              {organization?.createdAt && (
                <div className="info-row">
                  <span className="info-label">Started On</span>
                  <span className="info-value">{formatTimestamp(organization.createdAt)}</span>
                </div>
              )}
              {organization?.subscription?.renewsAt && (
                <>
                  <div className="info-row">
                    <span className="info-label">Next Renewal</span>
                    <span className="info-value">{formatDate(organization.subscription.renewsAt)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Days Remaining</span>
                    <span className="info-value">{calculateDaysRemaining(organization.subscription.renewsAt)} Days</span>
                  </div>
                </>
              )}
              
              <div className="plan-divider" />
              
              <div className="info-row">
                <span className="info-label">Projects</span>
                <span className="info-value">{currentPlan.maxProjects === -1 ? 'Unlimited' : currentPlan.maxProjects}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Team Members</span>
                <span className="info-value">{currentPlan.maxUsers === -1 ? 'Unlimited' : currentPlan.maxUsers}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Storage</span>
                <span className="info-value">{currentPlan.storageGB === -1 ? 'Unlimited' : `${currentPlan.storageGB} GB`}</span>
              </div>
              <div className="info-row">
                <span className="info-label">AI Limits</span>
                <span className="info-value">{currentPlan.aiQuota === -1 ? 'Unlimited' : `${currentPlan.aiQuota} Credits/mo`}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Auto Renewal</span>
                <span className="info-value">{organization?.subscription?.status === 'active' ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            <div className="plan-divider" />

            <div className="current-plan-actions">
              {currentPlan.id !== 'free' && (
                <button
                  className="cancel-subscription-btn"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade Plans */}
        {upgradePlans.length > 0 && (
          <div className="billing-main upgrade-main">
            <div className="plans-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Upgrade Your Plan</h3>
              <div className={`plans-selection-grid ${upgradePlans.length === 1 ? 'single-plan' : ''}`}>
                {upgradePlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className={`billing-plan-card ${plan.popular ? 'popular' : ''}`}
                  >
                    {plan.popular && <div className="popular-tag">Most Popular</div>}
                    <div className="plan-header">
                      <h4>{plan.name}</h4>
                      <div className="plan-price">
                        <span className="currency">₹</span>
                        <span className="amount">{plan.monthlyPrice}</span>
                        <span className="period">/mo</span>
                      </div>
                      <p className="plan-description">{plan.tagline}</p>
                    </div>

                    <div className="plan-divider" />

                    <div className="plan-features-container">
                      <ul className="plan-features">
                        {plan.features.filter(f => f.included).map((feature, i) => (
                          <li key={i}>
                            <CheckCircle2 size={16} className="feature-icon" />
                            {feature.label}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="plan-footer">
                      <button
                        className="plan-button primary"
                        onClick={() => handleUpgrade(plan)}
                        disabled={processingPlan === plan.id}
                        style={{
                          backgroundColor: branding.primaryColor,
                          borderColor: branding.primaryColor,
                          color: '#fff'
                        }}
                      >
                        {processingPlan === plan.id ? 'Processing...' : `Upgrade to ${plan.name}`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Payment History (Full Width) */}
      <div className="payment-history-container" style={{ marginTop: '32px' }}>
        <div className="billing-card payment-history-card">
          <div className="card-header">
            <h3>Payment History</h3>
          </div>
          <div className="table-responsive">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px' }}>Loading history...</td>
                  </tr>
                ) : paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      <FileText size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                      <p style={{ margin: 0 }}>No payment history available</p>
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatTimestamp(payment.createdAt)}</td>
                      <td>{formatPrice(payment.amount)}</td>
                      <td>
                        <span className={`status-badge ${payment.status?.toLowerCase() || 'pending'}`}>
                          {payment.status || 'Paid'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="download-btn"
                          title="Download Invoice"
                          onClick={() => handleDownloadInvoice(payment)}
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Additional Billing Features */}
      <div className="billing-footer-info">
        <div className="info-item">
          <div className="info-icon-wrapper">
            <BarChart3 size={20} />
          </div>
          <div className="info-content">
            <h5>Detailed Invoices</h5>
            <p>Download monthly GST compliant invoices from your history.</p>
          </div>
        </div>
        <div className="info-item">
          <div className="info-icon-wrapper">
            <RefreshCcw size={20} />
          </div>
          <div className="info-content">
            <h5>Cancel Anytime</h5>
            <p>No long term contracts. Downgrade or cancel with one click.</p>
          </div>
        </div>
        <div className="info-item">
          <div className="info-icon-wrapper">
            <Sparkles size={20} />
          </div>
          <div className="info-content">
            <h5>Need Custom Quota?</h5>
            <p>Contact our sales team for higher AI generation limits.</p>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowCancelModal(false)}
          >
            <div
              className="modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header warning">
                <AlertCircle size={24} className="warning-icon" />
                <h3>Cancel Subscription</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to downgrade to the Free plan?</p>
                <p className="warning-text">
                  You will lose access to premium features, and your limits will be reduced:
                </p>
                <ul className="downgrade-list">
                  <li>Limit of 2 projects</li>
                  <li>Limit of 30 AI generations per month</li>
                  <li>Community support only</li>
                </ul>
              </div>
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Current Plan
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDowngradeToFree}
                >
                  Yes, Downgrade
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default BillingPage;
