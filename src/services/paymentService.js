/**
 * paymentService.js
 * Production-grade payment service for Qualia SaaS platform.
 * Handles plan definitions, payment state machine, Razorpay integration helpers,
 * subscription management, and all edge-case logic.
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
import { db } from '../firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── PLAN DEFINITIONS ─────────────────────────────────────────────────────────
// Source of truth for all plan metadata. In production, these would live in
// Firestore `plans` collection and be managed via admin panel.

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free Sandbox',
    tagline: 'Perfect for solo developers & proofs of concept',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPricePaise: 0,
    yearlyPricePaise: 0,
    currency: 'INR',
    maxUsers: 1,
    maxProjects: 2,
    storageGB: 1,
    aiQuota: 50,
    trialDays: 0,
    popular: false,
    active: true,
    features: [
      { label: '1 User License', included: true },
      { label: '2 Active Projects', included: true },
      { label: '50 AI Bug generations / mo', included: true },
      { label: 'Basic Kanban Dashboard', included: true },
      { label: 'Public Bug Sharing', included: true },
      { label: 'Priority Support', included: false },
      { label: 'Advanced Analytics', included: false },
      { label: 'Custom Branding', included: false },
      { label: 'SSO / SAML', included: false },
    ],
    cta: 'Start Free',
    ctaSecondary: false,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'For growing teams getting started with QA',
    monthlyPrice: 999,      // ₹999/mo
    yearlyPrice: 9990,      // ₹9,990/yr (save ~17%)
    monthlyPricePaise: 99900,
    yearlyPricePaise: 999000,
    currency: 'INR',
    maxUsers: 5,
    maxProjects: 10,
    storageGB: 10,
    aiQuota: 500,
    trialDays: 14,
    popular: false,
    active: true,
    features: [
      { label: '5 User Licenses', included: true },
      { label: '10 Active Projects', included: true },
      { label: '500 AI Bug generations / mo', included: true },
      { label: 'Full Kanban Board', included: true },
      { label: 'Public Bug Sharing', included: true },
      { label: 'Email Support', included: true },
      { label: 'Basic Analytics', included: true },
      { label: 'Custom Branding', included: false },
      { label: 'SSO / SAML', included: false },
    ],
    cta: 'Start 14-Day Trial',
    ctaSecondary: false,
  },
  growth: {
    id: 'growth',
    name: 'Team Growth',
    tagline: 'Designed for active QA teams and developer hubs',
    monthlyPrice: 2999,     // ₹2,999/mo
    yearlyPrice: 28990,     // ₹28,990/yr (save ~19%)
    monthlyPricePaise: 299900,
    yearlyPricePaise: 2899000,
    currency: 'INR',
    maxUsers: 25,
    maxProjects: -1,        // unlimited
    storageGB: 50,
    aiQuota: 2000,
    trialDays: 14,
    popular: true,
    active: true,
    features: [
      { label: 'Up to 25 User Licenses', included: true },
      { label: 'Unlimited Active Projects', included: true },
      { label: '2,000 AI Bug generations / mo', included: true },
      { label: 'Full Kanban + Sprint Boards', included: true },
      { label: 'Custom Test Suite Catalog', included: true },
      { label: 'Priority Email Support', included: true },
      { label: 'Advanced Analytics', included: true },
      { label: 'Custom Branding', included: true },
      { label: 'SSO / SAML', included: false },
    ],
    cta: 'Get Team Growth',
    ctaSecondary: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Scale',
    tagline: 'Built for massive developer orgs with advanced workloads',
    monthlyPrice: null,     // contact sales
    yearlyPrice: null,
    monthlyPricePaise: null,
    yearlyPricePaise: null,
    currency: 'INR',
    maxUsers: -1,           // unlimited
    maxProjects: -1,
    storageGB: -1,          // unlimited
    aiQuota: -1,
    trialDays: 30,
    popular: false,
    active: true,
    features: [
      { label: 'Unlimited User Licenses', included: true },
      { label: 'Unlimited Projects & Orgs', included: true },
      { label: 'Unlimited AI Bug generations', included: true },
      { label: 'Custom Integrations & API', included: true },
      { label: 'Dedicated Slack Channel', included: true },
      { label: '24/7 Dedicated Support', included: true },
      { label: 'Advanced Analytics & Reports', included: true },
      { label: 'Full White-Labeling', included: true },
      { label: 'SSO / SAML / LDAP', included: true },
    ],
    cta: 'Contact Sales',
    ctaSecondary: false,
  },
};

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
    localStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify({
      ...data,
      savedAt: Date.now(),
    }));
  } catch (e) {}
}

export function getPendingPaymentSession() {
  try {
    const raw = localStorage.getItem(PAYMENT_SESSION_KEY);
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
    localStorage.removeItem(PAYMENT_SESSION_KEY);
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
  // Check for existing pending payment
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
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
 * Validate coupon code against Firestore
 */
export async function validateCoupon(couponCode) {
  if (!couponCode) return null;
  const q = query(
    collection(db, 'coupons'),
    where('code', '==', couponCode.toUpperCase()),
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

  // Free plan users are considered active without payment
  if (userProfile.planId === 'free' && payStatus === PAYMENT_STATUS.NOT_REQUIRED) return true;
  
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
      ip: 'client', // In production, get from server
    });
  } catch (e) {
    console.warn('[AuditLog] Failed to write audit log:', e);
  }
}
