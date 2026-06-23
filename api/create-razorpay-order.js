import Razorpay from 'razorpay';
import { execSync } from 'child_process';
import { verifyFirebaseToken, sendError, setCorsHeaders } from './_geminiHelper.js';

// Configuration
function getRazorpayConfig() {
  // Use the exact environment variable names from .env
  return {
    keyId: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_TEST_KEY_ID || process.env.VITE_RAZORPAY_LIVE_KEY_ID,
    secret: process.env.RAZORPAY_SECRET || process.env.RAZORPAY_TEST_SECRET || process.env.RAZORPAY_LIVE_SECRET,
  };
}

// Environment-aware pricing — mirrors frontend paymentService.js logic
// Priority: APP_ENV env var → VITE_APP_ENV env var → auto-detect from git branch

function detectAppEnv() {
  // 1. Explicit env var (set in Vercel dashboard or .env)
  if (process.env.APP_ENV) return process.env.APP_ENV;
  if (process.env.VITE_APP_ENV) return process.env.VITE_APP_ENV;

  // 2. Auto-detect from git branch (local dev only)
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const map = { 'stage': 'stage', 'pre-prod': 'pre-prod', 'main': 'production' };
    return map[branch] || 'production';
  } catch {
    return 'production';
  }
}

const APP_ENV = detectAppEnv();

function getPlanPrices() {
  // Starter plan price varies by environment
  let starterPrice;
  switch (APP_ENV) {
    case 'pre-prod':
      starterPrice = 10;  // ₹10 — real money testing
      break;
    case 'stage':
    default: // 'production'
      starterPrice = 0;   // Free
      break;
  }

  return {
    free: { monthly: starterPrice, yearly: starterPrice },
    pro: { monthly: 99, yearly: 79 },
    business: { monthly: 199, yearly: 159 },
  };
}

const PLAN_PRICES = getPlanPrices();

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'Method Not Allowed');

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Unauthorized: Missing or invalid token');
    }
    const idToken = authHeader.split('Bearer ')[1];
    const { uid: userId } = await verifyFirebaseToken(idToken);

    // 2. Parse Request
    const { planId, billingCycle, couponCode, currency = 'INR', usersCount = 1, notes } = req.body;
    
    if (!planId || !billingCycle) {
      return sendError(res, 400, 'Plan ID and billing cycle are required.');
    }
    if (!PLAN_PRICES[planId]) {
      return sendError(res, 400, 'Invalid plan ID.');
    }

    // 3. Calculate Pricing (Server-side source of truth)
    const pricePerUser = PLAN_PRICES[planId][billingCycle];
    const months = billingCycle === 'yearly' ? 12 : 1;
    const basePrice = pricePerUser * usersCount * months;

    // ── Coupon validation ────────────────────────────────────────────────
    let discount = 0;
    let finalAmount = basePrice;
    const upperCoupon = couponCode ? couponCode.toUpperCase() : null;

    if (upperCoupon === 'STAGE100') {
      // Staging-only hardcoded 100% off coupon — rejected in production
      if (APP_ENV === 'production') {
        return sendError(res, 400, 'Invalid coupon code.');
      }
      discount = basePrice;
      finalAmount = 0;
    }
    // For any other coupon codes, we skip server-side validation for now.
    // The frontend handles Firestore coupon lookups and applies them client-side.
    
    // Apply 18% tax
    const tax = Math.round(finalAmount * 0.18);
    const totalAmount = finalAmount + tax;

    // ── Free order (₹0 after coupon) — return mock order, skip Razorpay ──
    // Razorpay requires amount > 0, so we generate a synthetic order ID
    // and let the frontend activate the subscription directly.
    if (totalAmount <= 0) {
      const mockOrderId = `stage_free_${userId.slice(0, 8)}_${Date.now()}`;
      return res.status(200).json({
        result: {
          data: {
            id: mockOrderId,
            amount: 0,
            currency,
            status: 'paid',
            _stageCouponApplied: true,
          },
        },
      });
    }

    // 4. Initialize Razorpay
    const { keyId, secret } = getRazorpayConfig();
    if (!keyId || !secret) {
      console.error("Razorpay keys missing in environment variables.");
      return sendError(res, 500, 'Razorpay not configured on the server.');
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });

    // 5. Create Order
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // convert to paise
      currency,
      receipt: `qua_${userId.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId,
        planId,
        billingCycle,
        ...notes,
      },
    });

    // 6. Return order (Firestore `payments` document will be created by the frontend)
    return res.status(200).json({ result: { data: order } });

  } catch (error) {
    console.error("create-razorpay-order error:", error);
    return sendError(res, 500, error.message || 'Failed to create payment order');
  }
}
