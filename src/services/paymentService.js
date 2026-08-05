/**
 * paymentService.js
 * Production-grade payment service for Qualia SaaS platform.
 * Handles plan definitions, payment state machine, Razorpay integration helpers,
 * subscription management, and all edge-case logic.
 *
 * PRICING MODEL: Pure per-user pricing — no minimum users, no forced user limits.
 * Organizations pay only for active users they actually need.
 */

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';

// ── VERCEL API HELPER ────────────────────────────────────────────────────────
async function fetchFromApi(endpoint, payload) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  const url = endpoint;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data.result || data;
}

export async function createRazorpayOrderApi(payload) {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const fn = httpsCallable(functions, 'createRazorpayOrder');
    const result = await fn(payload);
    // Wrap in { data: ... } to match the Vercel API response structure expected by the frontend
    return { data: result.data };
  }
  return fetchFromApi('/api/create-razorpay-order', payload);
}

export async function verifyRazorpayPaymentApi(payload) {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const fn = httpsCallable(functions, 'verifyRazorpayPayment');
    const result = await fn(payload);
    // Wrap in { data: ... } to match the Vercel API response structure expected by the frontend
    return { data: result.data };
  }
  return fetchFromApi('/api/verify-razorpay-payment', payload);
}


// ── ENVIRONMENT-AWARE PRICING ────────────────────────────────────────────────
// Controls Starter plan pricing per environment:
//   stage      → FREE (₹0)  — safe development testing
//   pre-prod   → ₹10        — real money testing against prod backend
//   production → FREE (₹0)  — actual production pricing
const APP_ENV = import.meta.env.VITE_APP_ENV || 'production';

function getStarterPricing() {
  switch (APP_ENV) {
    case 'stage':
      return {
        name: 'Starter',
        tagline: 'For individuals and small teams',
        monthlyPrice: 0,
        yearlyPrice: 0,
        monthlyPricePaise: 0,
        yearlyPricePaise: 0,
        pricePerUser: 0,
        cta: 'Start Free',
      };
    case 'pre-prod':
      return {
        name: 'Starter (₹10 Test)',
        tagline: 'Pre-production payment testing',
        monthlyPrice: 10,
        yearlyPrice: 10,
        monthlyPricePaise: 1000,
        yearlyPricePaise: 1000,
        pricePerUser: 10,
        cta: 'Start for ₹10',
      };
    default: // 'production'
      return {
        name: 'Starter',
        tagline: 'For individuals and small teams',
        monthlyPrice: 0,
        yearlyPrice: 0,
        monthlyPricePaise: 0,
        yearlyPricePaise: 0,
        pricePerUser: 0,
        cta: 'Start Free',
      };
  }
}

const _starterPricing = getStarterPricing();

// ── PLAN DEFINITIONS ─────────────────────────────────────────────────────────
// Source of truth for all plan metadata.
// Per-user pricing: pricePerUser is the monthly cost per active user.
// Organizations are billed ONLY for the users they actually have.

export const PLANS = {
  free: {
    id: 'free',
    name: _starterPricing.name,
    tagline: 'Best for trying the platform',
    monthlyPrice: _starterPricing.monthlyPrice,
    yearlyPrice: _starterPricing.yearlyPrice,
    monthlyPricePaise: _starterPricing.monthlyPricePaise,
    yearlyPricePaise: _starterPricing.yearlyPricePaise,
    pricePerUser: _starterPricing.pricePerUser,
    currency: 'INR',
    maxUsers: 3,           // Free tier: up to 3 users
    maxProjects: 1,        // 1 Project
    storageGB: 0.1,        // 100 MB
    aiQuota: 10,           // 10 AI Bug Reports / Month
    aiQuotaPerUser: 0,
    trialDays: 0,
    popular: false,
    active: true,
    isPerUser: false,
    features: [
      { label: 'Up to 3 Users', included: true },
      { label: '1 Project', included: true },
      { label: '10 AI Bug Reports / Month', included: true },
      { label: 'Basic Kanban Board', included: true },
      { label: 'Community Support', included: true },
    ],
    cta: 'Start Free',
    ctaSecondary: false,
  },
  team: {
    id: 'team',
    name: 'Team',
    tagline: 'Best for startups and small QA teams',
    monthlyPrice: 499,
    yearlyPrice: 399,
    monthlyPricePaise: 49900,
    yearlyPricePaise: 39900,
    pricePerUser: 499,
    pricePerUserYearly: 399,
    currency: 'INR',
    maxUsers: 10,          // Up to 10 Users
    maxProjects: 10,       // Up to 10 Projects
    storageGB: 10,
    aiQuota: 100,          // 100 AI Bug Reports / Month
    aiQuotaPerUser: 0,
    trialDays: 0,
    popular: true,
    active: true,
    isPerUser: false,      // Changed to flat pricing based on requirements
    features: [
      { label: 'Up to 10 Users', included: true },
      { label: 'Up to 10 Projects', included: true },
      { label: 'Full Kanban Board', included: true },
      { label: 'Bug Tracking', included: true },
      { label: 'Test Case Management', included: true },
      { label: 'Team Collaboration', included: true },
      { label: 'Email Notifications', included: true },
      { label: 'Basic Analytics', included: true },
      { label: '100 AI Bug Reports / Month', included: true },
    ],
    cta: 'Get Team Plan',
    ctaSecondary: false,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'Best for growing companies',
    monthlyPrice: 1499,
    yearlyPrice: 1199,
    monthlyPricePaise: 149900,
    yearlyPricePaise: 119900,
    pricePerUser: 1499,
    pricePerUserYearly: 1199,
    currency: 'INR',
    maxUsers: 30,          // Up to 30 Users
    maxProjects: -1,       // Unlimited Projects
    storageGB: 50,
    aiQuota: 500,          // 500 AI Bug Reports / Month
    aiQuotaPerUser: 0,
    trialDays: 14,
    popular: false,
    active: true,
    isPerUser: false,      // Changed to flat pricing based on requirements
    features: [
      { label: 'Everything in Team, plus:', included: true },
      { label: 'Up to 30 Users', included: true },
      { label: 'Unlimited Projects', included: true },
      { label: 'API Access', included: true },
      { label: 'Webhooks', included: true },
      { label: 'Advanced Analytics', included: true },
      { label: 'Custom Workflows', included: true },
      { label: 'Role-Based Access Control', included: true },
      { label: 'Priority Support', included: true },
      { label: '500 AI Bug Reports / Month', included: true },
    ],
    cta: 'Get Growth Plan',
    ctaSecondary: true,
  },
};

// Map plan aliases
PLANS.starter = PLANS.free;
PLANS['starter-plan'] = PLANS.free;
PLANS['starter_plan'] = PLANS.free;
PLANS['1rs'] = PLANS.free;
PLANS['1-rs'] = PLANS.free;
PLANS['1_rs'] = PLANS.free;
PLANS['free-plan'] = PLANS.free;
PLANS['free_plan'] = PLANS.free;
PLANS['pro-plan'] = PLANS.pro;
PLANS['pro_plan'] = PLANS.pro;
PLANS['business-plan'] = PLANS.business;
PLANS['business_plan'] = PLANS.business;

export function getPlanById(planId) {
  if (!planId) return null;
  let str = typeof planId === 'object' ? (planId.id || planId.planId || '') : String(planId);
  str = str.toLowerCase().trim().replace(/[-_](monthly|yearly|plan|pack)$/g, '').trim();

  const aliasMap = {
    starter: 'free',
    'starter-plan': 'free',
    'starter_plan': 'free',
    '1rs': 'free',
    '1-rs': 'free',
    '1_rs': 'free',
    '1rstestplan': 'free',
    '1-rs-test-plan': 'free',
    'free-plan': 'free',
    'free_plan': 'free',
    'pro-plan': 'pro',
    'pro_plan': 'pro',
    'business-plan': 'business',
    'business_plan': 'business',
  };
  const effectiveId = aliasMap[str] || str;
  return PLANS[effectiveId] || null;
}

// ── AI CREDIT ADD-ONS ─────────────────────────────────────────────────────────
export const AI_CREDIT_PACKS = [
  { id: 'pack_500',   credits: 500,   price: 199,   label: '500 AI Credits',   priceDisplay: '₹199'   },
  { id: 'pack_2000',  credits: 2000,  price: 699,   label: '2,000 AI Credits', priceDisplay: '₹699'   },
  { id: 'pack_10000', credits: 10000, price: 2499,  label: '10,000 AI Credits',priceDisplay: '₹2,499' },
];

// ── BILLING HELPERS ───────────────────────────────────────────────────────────
/**
 * Calculate total monthly cost for a per-user plan.
 * @param {object} plan  - Plan from PLANS
 * @param {number} users - Number of active users
 * @param {boolean} yearly - Annual billing
 */
export function calculatePlanCost(plan, users, yearly = false) {
  if (!plan.isPerUser) return yearly ? plan.yearlyPrice : plan.monthlyPrice;
  const pricePerUser = yearly ? (plan.pricePerUserYearly || plan.yearlyPrice) : plan.pricePerUser;
  return pricePerUser * users;
}

/**
 * Calculate annual cost with 20% discount applied.
 */
export function calculateAnnualCost(plan, users) {
  if (!plan.isPerUser) return plan.yearlyPrice ? plan.yearlyPrice * 12 : null;
  const monthly = plan.pricePerUser * users * 12;
  return Math.round(monthly * 0.8); // 20% annual discount
}

/**
 * Get monthly savings when choosing annual billing.
 */
export function getAnnualSavings(plan, users) {
  if (!plan.isPerUser || !plan.pricePerUser) return 0;
  const monthlyAnnual = plan.pricePerUser * users * 12;
  const annual = calculateAnnualCost(plan, users);
  return monthlyAnnual - annual;
}

// ── PAYMENT STATUS ENUM ───────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  NOT_REQUIRED: 'NOT_REQUIRED',  // free plan
  PENDING: 'PENDING',            // order created, awaiting payment
  PROCESSING: 'PROCESSING',      // payment submitted, verifying
  PAID: 'PAID',                  // verified and confirmed
  FAILED: 'FAILED',              // payment failed
  REFUNDED: 'REFUNDED',          // refund processed
  EXPIRED: 'EXPIRED',            // pending too long (48hr)
  CANCELLED: 'CANCELLED',        // user cancelled
};

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  GRACE: 'GRACE',          // payment past due, 7-day grace
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  PAUSED: 'PAUSED',
};

export const ORG_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
};

// ── GST CONFIG ────────────────────────────────────────────────────────────────
export const GST_RATE = 0.18; // 18% GST (India)
export const CGST_RATE = 0.09;
export const SGST_RATE = 0.09;

/**
 * Calculate tax breakdown for a given amount (in INR, not paise)
 */
export function calculateTaxBreakdown(baseAmountINR, gstNumber = null) {
  const isGSTRegistered = Boolean(gstNumber && gstNumber.trim().length > 0);
  const cgst = isGSTRegistered ? 0 : Math.round(baseAmountINR * CGST_RATE);
  const sgst = isGSTRegistered ? 0 : Math.round(baseAmountINR * SGST_RATE);
  const igst = isGSTRegistered ? Math.round(baseAmountINR * GST_RATE) : 0;
  const totalTax = cgst + sgst + igst;
  const totalAmount = baseAmountINR + totalTax;

  return {
    baseAmount: baseAmountINR,
    cgst,
    sgst,
    igst,
    totalTax,
    totalAmount,
    isGSTRegistered,
  };
}

/**
 * Calculate coupon discount
 */
export function applyCoupon(baseAmount, coupon) {
  if (!coupon) return { discount: 0, finalAmount: baseAmount, couponCode: null };

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round(baseAmount * (coupon.value / 100));
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else if (coupon.type === 'fixed') {
    discount = Math.min(coupon.value, baseAmount);
  }

  return {
    discount,
    finalAmount: baseAmount - discount,
    couponCode: coupon.code,
    couponType: coupon.type,
    couponValue: coupon.value,
  };
}

// ── PENDING PAYMENT SESSION ───────────────────────────────────────────────────
const PAYMENT_SESSION_KEY = 'qualia_payment_session';

export function savePendingPaymentSession(data) {
  try {
    sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify({
      ...data,
      savedAt: Date.now(),
    }));
  } catch (e) {}
}

export function getPendingPaymentSession() {
  try {
    const raw = sessionStorage.getItem(PAYMENT_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      clearPendingPaymentSession();
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

export function clearPendingPaymentSession() {
  try {
    sessionStorage.removeItem(PAYMENT_SESSION_KEY);
  } catch (e) {}
}

// ── SELECTED PLAN SESSION ─────────────────────────────────────────────────────
const PLAN_SESSION_KEY = 'qualia_selected_plan';

export function saveSelectedPlan(planId, billingCycle, couponCode = null) {
  try {
    sessionStorage.setItem(PLAN_SESSION_KEY, JSON.stringify({ planId, billingCycle, couponCode, savedAt: Date.now() }));
  } catch (e) {}
}

export function getSelectedPlan() {
  try {
    const raw = sessionStorage.getItem(PLAN_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > 2 * 60 * 60 * 1000) {
      clearSelectedPlan();
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

export function clearSelectedPlan() {
  try {
    sessionStorage.removeItem(PLAN_SESSION_KEY);
  } catch (e) {}
}

// ── FIRESTORE PAYMENT HELPERS ─────────────────────────────────────────────────

/**
 * Create or update a pending payment record for a user.
 * Idempotent — safe to call multiple times.
 */
export async function createOrUpdatePendingPayment(userId, paymentData) {
  const existingQuery = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    where('status', '==', PAYMENT_STATUS.PENDING),
    limit(1)
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    await updateDoc(doc(db, 'payments', existingDoc.id), {
      ...paymentData,
      updatedAt: serverTimestamp(),
    });
    return existingDoc.id;
  }

  const docRef = await addDoc(collection(db, 'payments'), {
    ...paymentData,
    userId,
    status: PAYMENT_STATUS.PENDING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    attempts: 0,
    webhookProcessed: false,
  });
  return docRef.id;
}

/**
 * Get user's current payment status from Firestore
 */
export async function getUserPaymentStatus(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;
  return userDoc.data();
}

/**
 * Get the latest payment record for a user
 */
export async function getUserLatestPayment(userId) {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Get all payments for a user (billing history)
 */
export async function getUserPaymentHistory(userId) {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return payments.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt).getTime() || 0);
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt).getTime() || 0);
    return timeB - timeA;
  });
}

/**
 * Subscribe to user payment status changes in real time
 */
export function subscribeToUserPaymentStatus(userId, callback) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}

/**
 * Validate coupon code against Firestore.
 * STAGE100 is a hardcoded staging-only coupon (100% off) that never touches Firestore.
 * It is rejected outright when APP_ENV === 'production'.
 */
export async function validateCoupon(couponCode) {
  if (!couponCode) return null;

  const upperCode = couponCode.toUpperCase();

  // ── Staging-only hardcoded coupon: STAGE100 ────────────────────────────
  // Gives 100% discount — only valid outside production
  if (upperCode === 'STAGE100') {
    if (APP_ENV === 'production') {
      return { valid: false, error: 'Invalid coupon code' };
    }
    return {
      valid: true,
      coupon: {
        id: '__stage_100',
        code: 'STAGE100',
        type: 'percent',
        value: 100,
        maxDiscount: null,
        active: true,
        _isStaging: true, // internal flag
      },
    };
  }

  // ── Standard Firestore-based coupon validation ─────────────────────────
  const q = query(
    collection(db, 'coupons'),
    where('code', '==', upperCode),
    where('active', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return { valid: false, error: 'Invalid coupon code' };

  const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() };
  const now = new Date();

  if (coupon.expiresAt && coupon.expiresAt.toDate() < now) {
    return { valid: false, error: 'Coupon has expired' };
  }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }

  return { valid: true, coupon };
}

/**
 * Check if user has an active payment / subscription
 */
export function hasActiveSubscription(userProfile) {
  if (!userProfile) return false;
  const payStatus = userProfile.paymentStatus;
  const subStatus = userProfile.subscriptionStatus;

  if (userProfile.planId === 'free' && payStatus === PAYMENT_STATUS.NOT_REQUIRED) return true;

  // COUPON status = activated via staging coupon (e.g. STAGE100)
  if (payStatus === 'COUPON' && subStatus === SUBSCRIPTION_STATUS.ACTIVE) return true;

  return payStatus === PAYMENT_STATUS.PAID &&
    (subStatus === SUBSCRIPTION_STATUS.ACTIVE ||
     subStatus === SUBSCRIPTION_STATUS.TRIAL);
}

/**
 * Check if user needs to complete payment
 */
export function needsPayment(userProfile) {
  if (!userProfile) return false;
  const payStatus = userProfile.paymentStatus;
  return (
    payStatus === PAYMENT_STATUS.PENDING ||
    payStatus === PAYMENT_STATUS.FAILED ||
    payStatus === PAYMENT_STATUS.EXPIRED ||
    payStatus === PAYMENT_STATUS.CANCELLED ||
    (!payStatus && userProfile.planId && userProfile.planId !== 'free')
  );
}

/**
 * Format price for display (INR)
 */
export function formatPrice(amountINR) {
  if (amountINR === null || amountINR === undefined) return 'Contact Sales';
  if (amountINR === 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amountINR);
}

/**
 * Generate an invoice number
 */
export function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `QUA-${year}${month}-${random}`;
}

/**
 * Log audit event
 */
export async function logAuditEvent(userId, action, details = {}) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
      ip: 'client',
    });
  } catch (e) {
    console.warn('[AuditLog] Failed to write audit log:', e);
  }
}
