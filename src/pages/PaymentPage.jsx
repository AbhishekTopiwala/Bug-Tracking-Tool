import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  PLANS, PAYMENT_STATUS, SUBSCRIPTION_STATUS,
  calculateTaxBreakdown, applyCoupon, formatPrice,
  getSelectedPlan, clearSelectedPlan, savePendingPaymentSession,
  getPendingPaymentSession, clearPendingPaymentSession,
  createOrUpdatePendingPayment, validateCoupon, logAuditEvent,
  generateInvoiceNumber, createRazorpayOrderApi, verifyRazorpayPaymentApi
} from '../services/paymentService';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp, getDoc, writeBatch, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import {
  Shield, Check, AlertTriangle, Loader2, RefreshCw,
  Tag, ChevronRight, Lock, CreditCard, FileText,
  Star, Zap, Users, Folder, X, BadgeCheck
} from 'lucide-react';

// ── Razorpay script loader ────────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [usersCount, setUsersCount] = useState(1);
  const paymentInProgress = useRef(false);

  // ── Load plan data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }

    // Try location state first, then session storage
    const stateData = location.state;
    const sessionData = getSelectedPlan();
    const source = stateData || sessionData;

    if (source?.planId && PLANS[source.planId]) {
      setSelectedPlan(PLANS[source.planId]);
      setBillingCycle(source.billingCycle || 'monthly');
      if (source.couponCode) setCouponCode(source.couponCode);
    } else {
      // No plan selected — redirect to pricing
      navigate('/#pricing');
      return;
    }

    // If user already paid, redirect to dashboard, UNLESS they are upgrading
    // To allow upgrades, we don't strictly redirect if they come with a stateData plan.
    if (userProfile?.paymentStatus === PAYMENT_STATUS.PAID && !stateData) {
      navigate('/admin');
      return;
    }

    if (userProfile?.organizationId) {
      getDoc(doc(db, 'organizations', userProfile.organizationId)).then(snap => {
        if (snap.exists() && snap.data().memberCount) {
          setUsersCount(snap.data().memberCount);
        }
        setPageLoading(false);
      }).catch(err => {
        console.error("Failed to load org:", err);
        setPageLoading(false);
      });
    } else {
      setPageLoading(false);
    }
  }, [currentUser, userProfile, navigate, location.state]);

  // ── Price calculations ─────────────────────────────────────────────────────
  const basePricePerMonth = selectedPlan
    ? (billingCycle === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice) ?? 0
    : 0;
  const basePrice = (billingCycle === 'yearly' ? basePricePerMonth * 12 : basePricePerMonth) * usersCount;
  const { discount, finalAmount: afterCoupon } = applyCoupon(basePrice, appliedCoupon);
  const taxData = calculateTaxBreakdown(afterCoupon, userProfile?.gstNumber);
  const isFree = taxData.totalAmount === 0;

  // ── Coupon validation ──────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const result = await validateCoupon(couponCode.trim());
      if (result.valid) {
        setAppliedCoupon(result.coupon);
        toast.success(`Coupon applied! You save ${formatPrice(discount)}`);
      } else {
        setCouponError(result.error);
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError('Failed to validate coupon. Try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  // ── Free plan activation ───────────────────────────────────────────────────
  const activateFreePlan = async () => {
    setPaymentLoading(true);
    try {
      const batch = writeBatch(db);
      
      let orgId = userProfile?.organizationId;
      const isUpgrade = !!orgId;
      const orgRef = isUpgrade ? doc(db, "organizations", orgId) : doc(collection(db, "organizations"));
      if (!orgId) orgId = orgRef.id;

      const now = new Date();
      const resetDate = new Date(now.setMonth(now.getMonth() + 1));

      const subscriptionDetails = {
        plan: 'free',
        status: 'ACTIVE',
        aiQuota: 30,
        aiUsed: 0,
        billingCycle: null,
        startDate: new Date().toISOString(),
        resetDate: resetDate.toISOString(),
        maxUsers: 5,
        maxProjects: 2,
      };

      if (isUpgrade) {
        batch.update(orgRef, {
          subscription: subscriptionDetails,
        });
      } else {
        batch.set(orgRef, {
          name: userProfile?.workspaceName || (userProfile?.displayName + "'s Workspace"),
          ownerId: currentUser.uid,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          subscription: subscriptionDetails,
        });
      }

      const userRef = doc(db, "users", currentUser.uid);
      batch.update(userRef, {
        organizationId: orgId,
        planId: 'free',
        paymentStatus: 'NOT_REQUIRED',
        subscriptionStatus: 'ACTIVE',
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      clearSelectedPlan();
      clearPendingPaymentSession();
      if (fetchUserProfile) await fetchUserProfile(currentUser.uid);
      toast.success('Free plan activated! Welcome to Qualia 🎉');
      navigate('/admin');
    } catch (err) {
      toast.error(`Failed to activate: ${err.message || 'Unknown error'}`);
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Razorpay payment ───────────────────────────────────────────────────────
  const handlePayment = useCallback(async () => {
    if (paymentInProgress.current) return; // Duplicate click guard
    if (!selectedPlan || !currentUser) return;

    if (isFree) { activateFreePlan(); return; }
    if (selectedPlan.id === 'enterprise') {
      window.open('mailto:sales@qualia.app?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    paymentInProgress.current = true;
    setPaymentLoading(true);
    setError('');

    try {
      // 1. Load Razorpay SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) throw new Error('Failed to load payment SDK. Check your connection.');

      // 2. Create Razorpay order via Vercel API
      const orderResult = await createRazorpayOrderApi({
        amount: taxData.totalAmount, // INR
        currency: 'INR',
        planId: selectedPlan.id,
        billingCycle,
        usersCount,
        couponCode: appliedCoupon?.code || null,
        notes: {
          userId: currentUser.uid,
          planId: selectedPlan.id,
          billingCycle,
          email: currentUser.email,
        },
      });

      const order = orderResult.data || orderResult;

      // Create a pending payment document in Firestore BEFORE opening Razorpay
      const payRef = await addDoc(collection(db, "payments"), {
        userId: currentUser.uid,
        planId: selectedPlan.id,
        billingCycle,
        razorpayOrderId: order.id,
        amount: taxData.totalAmount, 
        currency: 'INR',
        status: "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        webhookProcessed: false,
        attempts: 1,
        couponCode: appliedCoupon?.code || null,
      });
      const payDocId = payRef.id;

      // 3. Save pending session (for browser-close recovery)
      savePendingPaymentSession({
        orderId: order.id,
        planId: selectedPlan.id,
        billingCycle,
        amount: taxData.totalAmount,
        userId: currentUser.uid,
      });

      // 4. Update user's payment status to PENDING
      await updateDoc(doc(db, 'users', currentUser.uid), {
        paymentStatus: PAYMENT_STATUS.PENDING,
        pendingOrderId: order.id,
        pendingPlanId: selectedPlan.id,
        pendingBillingCycle: billingCycle,
        updatedAt: serverTimestamp(),
      });

      await logAuditEvent(currentUser.uid, 'PAYMENT_INITIATED', {
        orderId: order.id, planId: selectedPlan.id, amount: taxData.totalAmount,
      });

      // 5. Open Razorpay checkout
      const rzpKey = import.meta.env.DEV 
        ? (import.meta.env.VITE_RAZORPAY_TEST_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY_ID)
        : (import.meta.env.VITE_RAZORPAY_LIVE_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY_ID);

      const options = {
        key: rzpKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Qualia',
        description: `${selectedPlan.name} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        order_id: order.id,
        prefill: {
          name: userProfile.displayName,
          email: currentUser.email,
        },
        theme: { color: '#5B6CFF' },
        modal: {
          ondismiss: async () => {
            // User closed the payment popup
            paymentInProgress.current = false;
            setPaymentLoading(false);
            await updateDoc(doc(db, 'users', currentUser.uid), {
              paymentStatus: PAYMENT_STATUS.CANCELLED,
              updatedAt: serverTimestamp(),
            });
            await logAuditEvent(currentUser.uid, 'PAYMENT_CANCELLED', { orderId: order.id });
            toast('Payment cancelled. You can retry anytime.', { icon: '⚠️' });
          },
        },
        handler: async (response) => {
          // 6. Verify payment on backend via Vercel API
          setPaymentLoading(true);
          try {
            const verifyResult = await verifyRazorpayPaymentApi({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResult.data?.success || verifyResult.success) {
              // Now that signature is verified, update Firestore securely
              const batch = writeBatch(db);

              let orgId = userProfile.organizationId;
              const isUpgrade = !!orgId;
              const orgRef = isUpgrade ? doc(db, "organizations", orgId) : doc(collection(db, "organizations"));
              if (!orgId) orgId = orgRef.id;

              const now = new Date();
              const periodEnd = billingCycle === "yearly"
                ? new Date(now.setFullYear(now.getFullYear() + 1))
                : new Date(now.setMonth(now.getMonth() + 1));

              const subscriptionDetails = {
                plan: selectedPlan.id,
                status: "ACTIVE",
                billingCycle,
                startDate: new Date().toISOString(),
                currentPeriodEnd: periodEnd.toISOString(),
                autoRenew: true,
                aiQuota: selectedPlan.aiQuota,
                aiUsed: 0,
                maxUsers: selectedPlan.maxUsers,
                maxProjects: selectedPlan.maxProjects,
                lastPaymentId: response.razorpay_payment_id,
                lastPaymentAt: new Date().toISOString(),
                resetDate: periodEnd.toISOString(),
              };

              if (isUpgrade) {
                batch.update(orgRef, {
                  subscription: subscriptionDetails,
                  gstNumber: userProfile.gstNumber || null,
                });
              } else {
                batch.set(orgRef, {
                  name: userProfile.workspaceName || (userProfile.displayName + "'s Workspace"),
                  ownerId: currentUser.uid,
                  status: "ACTIVE",
                  createdAt: new Date().toISOString(),
                  subscription: subscriptionDetails,
                  gstNumber: userProfile.gstNumber || null,
                  country: userProfile.country || "India",
                });
              }

              // Update user document
              batch.update(doc(db, "users", currentUser.uid), {
                organizationId: orgId,
                paymentStatus: "PAID",
                subscriptionStatus: "ACTIVE",
                planId: selectedPlan.id,
                billingCycle,
                updatedAt: serverTimestamp(),
                pendingOrderId: null,
                pendingPlanId: null,
                pendingBillingCycle: null,
              });

              // Update the pending payment document
              if (payDocId) {
                batch.update(doc(db, "payments", payDocId), {
                  organizationId: orgId,
                  status: "PAID",
                  razorpayPaymentId: response.razorpay_payment_id,
                  updatedAt: serverTimestamp(),
                });
              }

              // Create invoice record
              const invoiceNumber = generateInvoiceNumber();
              const invoiceRef = doc(collection(db, "invoices"));
              batch.set(invoiceRef, {
                userId: currentUser.uid,
                organizationId: orgId,
                invoiceNumber,
                paymentId: payDocId || null,
                planId: selectedPlan.id,
                billingCycle,
                amount: taxData.totalAmount,
                currency: "INR",
                gstNumber: userProfile.gstNumber || null,
                status: "ISSUED",
                issuedAt: new Date().toISOString(),
                periodStart: new Date().toISOString(),
                periodEnd: periodEnd.toISOString(),
                email: currentUser.email,
              });

              // Audit log
              const auditRef = doc(collection(db, "audit_logs"));
              batch.set(auditRef, {
                userId: currentUser.uid,
                action: isUpgrade ? "PLAN_UPGRADED" : "PAYMENT_VERIFIED_AND_ORG_CREATED",
                details: {
                  planId: selectedPlan.id, billingCycle, orgId,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  amount: taxData.totalAmount,
                },
                timestamp: serverTimestamp(),
              });

              await batch.commit();

              clearSelectedPlan();
              clearPendingPaymentSession();
              await fetchUserProfile(currentUser.uid);
              toast.success('Payment successful! Your workspace is ready 🎉');
              navigate('/admin', { state: { justPaid: true } });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (verifyErr) {
            console.error('[Payment] Verification error:', verifyErr);
            await updateDoc(doc(db, 'users', currentUser.uid), {
              paymentStatus: PAYMENT_STATUS.FAILED,
              updatedAt: serverTimestamp(),
            });
            await logAuditEvent(currentUser.uid, 'PAYMENT_VERIFICATION_FAILED', {
              error: verifyErr.message, orderId: order.id,
            });
            setError('Payment completed but verification failed. Please contact support — you will not be charged twice.');
            toast.error('Verification error. Contact support@qualia.app');
          } finally {
            paymentInProgress.current = false;
            setPaymentLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (response) => {
        paymentInProgress.current = false;
        setPaymentLoading(false);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          paymentStatus: PAYMENT_STATUS.FAILED,
          updatedAt: serverTimestamp(),
        });
        await logAuditEvent(currentUser.uid, 'PAYMENT_FAILED', {
          error: response.error?.description, orderId: order.id,
        });
        toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
        setError(`Payment failed: ${response.error?.description || 'Please try again.'}`);
      });

      rzp.open();
    } catch (err) {
      console.error('[Payment] Error:', err);
      paymentInProgress.current = false;
      setPaymentLoading(false);
      setError(err.message || 'Something went wrong. Please try again.');
      toast.error(err.message || 'Payment failed. Please try again.');
    }
  }, [selectedPlan, billingCycle, appliedCoupon, currentUser, userProfile, taxData, isFree, fetchUserProfile, navigate, basePrice]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="payment-loading-screen">
        <div className="payment-loading-content">
          <Loader2 size={32} className="spin" style={{ color: '#5B6CFF' }} />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!selectedPlan) return null;

  return (
    <div className="payment-page">
      <div className="payment-bg-glow" />

      {/* Header */}
      <div className="payment-header">
        <div className="payment-header-brand">
          <div className="payment-logo">Q</div>
          <span className="payment-brand-name">Qualia</span>
        </div>
        <div className="payment-header-secure">
          <Lock size={14} />
          <span>256-bit SSL Encryption</span>
        </div>
      </div>

      <div className="payment-container">
        {/* Left: Plan Summary */}
        <div className="payment-summary-panel">
          <div className="payment-panel-label">ORDER SUMMARY</div>

          {/* Plan Card */}
          <div className={`payment-plan-card ${selectedPlan.popular ? 'popular' : ''}`}>
            {selectedPlan.popular && (
              <div className="payment-plan-popular-badge">
                <Star size={12} fill="currentColor" /> Most Popular
              </div>
            )}
            <div className="payment-plan-name">{selectedPlan.name}</div>
            <div className="payment-plan-tagline">{selectedPlan.tagline}</div>

            <div className="payment-plan-features">
              {selectedPlan.features.filter(f => f.included).slice(0, 5).map((f, i) => (
                <div key={i} className="payment-feature-row">
                  <Check size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>

            <div className="payment-plan-limits">
              <div className="limit-item">
                <Users size={13} />
                <span>{selectedPlan.maxUsers === -1 ? 'Unlimited' : selectedPlan.maxUsers} users</span>
              </div>
              <div className="limit-item">
                <Folder size={13} />
                <span>{selectedPlan.maxProjects === -1 ? 'Unlimited' : selectedPlan.maxProjects} projects</span>
              </div>
              <div className="limit-item">
                <Zap size={13} />
                <span>{selectedPlan.aiQuota === -1 ? 'Unlimited' : selectedPlan.aiQuota} AI credits/mo</span>
              </div>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          {selectedPlan.id !== 'free' && selectedPlan.id !== 'enterprise' && (
            <div className="billing-cycle-toggle">
              <button
                className={`cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`cycle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
                <span className="cycle-save-badge">Save 20%</span>
              </button>
            </div>
          )}

          {/* Price Breakdown */}
          {!isFree && selectedPlan.id !== 'enterprise' && (
            <div className="payment-breakdown">
              <div className="breakdown-row">
                <span>Plan ({billingCycle}) × {usersCount} User{usersCount !== 1 ? 's' : ''}</span>
                <span>{formatPrice(basePrice)}</span>
              </div>
              {discount > 0 && (
                <div className="breakdown-row discount">
                  <span>Coupon ({appliedCoupon?.code})</span>
                  <span>- {formatPrice(discount)}</span>
                </div>
              )}
              {taxData.cgst > 0 && (
                <div className="breakdown-row tax">
                  <span>CGST (9%)</span>
                  <span>{formatPrice(taxData.cgst)}</span>
                </div>
              )}
              {taxData.sgst > 0 && (
                <div className="breakdown-row tax">
                  <span>SGST (9%)</span>
                  <span>{formatPrice(taxData.sgst)}</span>
                </div>
              )}
              {taxData.igst > 0 && (
                <div className="breakdown-row tax">
                  <span>IGST (18%)</span>
                  <span>{formatPrice(taxData.igst)}</span>
                </div>
              )}
              <div className="breakdown-divider" />
              <div className="breakdown-row total">
                <span>Total</span>
                <span>{formatPrice(taxData.totalAmount)}</span>
              </div>
            </div>
          )}

          {/* Coupon */}
          {!isFree && selectedPlan.id !== 'enterprise' && !appliedCoupon && (
            <div className="coupon-section">
              <div className="coupon-input-row">
                <Tag size={15} style={{ color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  className="coupon-input"
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="coupon-apply-btn"
                >
                  {couponLoading ? <Loader2 size={13} className="spin" /> : 'Apply'}
                </button>
              </div>
              {couponError && <p className="coupon-error">{couponError}</p>}
            </div>
          )}
          {appliedCoupon && (
            <div className="coupon-applied-badge">
              <BadgeCheck size={15} style={{ color: '#22c55e' }} />
              <span>Coupon <strong>{appliedCoupon.code}</strong> applied</span>
              <button onClick={() => setAppliedCoupon(null)} className="coupon-remove">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Security badges */}
          <div className="payment-security-badges">
            <div className="security-badge"><Shield size={13} /> Secured by Razorpay</div>
            <div className="security-badge"><Lock size={13} /> PCI DSS Compliant</div>
          </div>
        </div>

        {/* Right: Payment Action */}
        <div className="payment-action-panel">
          <div className="payment-panel-label">COMPLETE YOUR SUBSCRIPTION</div>

          <div className="payment-user-info">
            <div className="payment-user-avatar">
              {(userProfile?.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="payment-user-name">{userProfile?.displayName}</div>
              <div className="payment-user-email">{currentUser?.email}</div>
            </div>
          </div>

          {error && (
            <div className="payment-error-box">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Plan price display */}
          <div className="payment-amount-display">
            {isFree ? (
              <div className="amount-free">Free Forever</div>
            ) : selectedPlan.id === 'enterprise' ? (
              <div className="amount-custom">Custom Pricing</div>
            ) : (
              <>
                <div className="amount-value">{formatPrice(taxData.totalAmount)}</div>
                <div className="amount-period">
                  {billingCycle === 'yearly' ? 'per year' : 'per month'} · inc. 18% GST
                </div>
              </>
            )}
          </div>

          {/* CTA Button */}
          <button
            id="pay-now-btn"
            className={`payment-cta-btn ${paymentLoading ? 'loading' : ''}`}
            onClick={handlePayment}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                Processing...
              </>
            ) : isFree ? (
              <>
                <Check size={18} />
                Activate Free Plan
              </>
            ) : selectedPlan.id === 'enterprise' ? (
              <>
                <ChevronRight size={18} />
                Contact Sales Team
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Pay {formatPrice(taxData.totalAmount)} Securely
              </>
            )}
          </button>

          {/* Trial info */}
          {selectedPlan.trialDays > 0 && (
            <p className="payment-trial-note">
              ✦ Your {selectedPlan.trialDays}-day free trial starts immediately. Cancel anytime.
            </p>
          )}

          <p className="payment-refund-note">
            30-day money-back guarantee · No questions asked
          </p>

          {/* What happens next */}
          <div className="payment-next-steps">
            <div className="next-steps-title">What happens next</div>
            <div className="next-step"><span className="step-num">1</span>Payment is verified securely</div>
            <div className="next-step"><span className="step-num">2</span>Your organization workspace is created</div>
            <div className="next-step"><span className="step-num">3</span>You get immediate access to all features</div>
            <div className="next-step"><span className="step-num">4</span>Invoice sent to your email</div>
          </div>

          <div className="payment-support-link">
            Need help? <a href="mailto:support@qualia.app">support@qualia.app</a>
          </div>
        </div>
      </div>
    </div>
  );
}
