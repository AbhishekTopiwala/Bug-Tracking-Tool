import Razorpay from 'razorpay';
import { verifyFirebaseToken, sendError, setCorsHeaders } from './_geminiHelper.js';

// Configuration
function getRazorpayConfig() {
  const keys = [
    process.env.VITE_RAZORPAY_KEY_ID,
    process.env.RAZORPAY_KEY_ID,
    process.env.VITE_RAZORPAY_TEST_KEY_ID,
    process.env.RAZORPAY_TEST_KEY_ID,
    process.env.VITE_RAZORPAY_LIVE_KEY_ID,
    process.env.RAZORPAY_LIVE_KEY_ID,
  ];
  const secrets = [
    process.env.RAZORPAY_SECRET,
    process.env.RAZORPAY_TEST_SECRET,
    process.env.RAZORPAY_LIVE_SECRET,
    process.env.RAZORPAY_KEY_SECRET,
    process.env.RAZORPAY_TEST_KEY_SECRET,
    process.env.VITE_RAZORPAY_SECRET,
    process.env.VITE_RAZORPAY_TEST_SECRET,
    process.env.VITE_RAZORPAY_KEY_SECRET,
  ];

  const keyId = keys.find((k) => typeof k === 'string' && k.trim().length > 0)?.trim();
  const secret = secrets.find((s) => typeof s === 'string' && s.trim().length > 0)?.trim();

  return { keyId, secret };
}

// Environment-aware pricing — mirrors frontend paymentService.js logic
// Priority: APP_ENV env var → VITE_APP_ENV env var → VERCEL_ENV → 'production'
function normalizePlanId(rawPlanId) {
  if (!rawPlanId) return '';
  let str = typeof rawPlanId === 'object' ? (rawPlanId.id || rawPlanId.planId || '') : String(rawPlanId);
  str = str.toLowerCase().trim();
  str = str.replace(/[-_](monthly|yearly|plan|pack)$/g, '').trim();

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

  return aliasMap[str] || str;
}

function getPlanPrices() {
  const env = detectAppEnv();
  let starterPrice;
  switch (env) {
    case 'pre-prod':
      starterPrice = 10;  // ₹10 — real money testing
      break;
    case 'stage':
      starterPrice = 1;   // ₹1 — 1 Rs Test Plan for stage environment testing
      break;
    default: // 'production'
      starterPrice = 0;   // Free
      break;
  }

  return {
    free: { monthly: starterPrice, yearly: starterPrice },
    starter: { monthly: starterPrice, yearly: starterPrice },
    pro: { monthly: 99, yearly: 79 },
    business: { monthly: 199, yearly: 159 },
  };
}

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

    const effectivePlanId = normalizePlanId(planId);
    const planPrices = getPlanPrices();
    console.log(`[create-razorpay-order] Received planId: ${JSON.stringify(planId)} (effective: "${effectivePlanId}"), billingCycle: "${billingCycle}", env: "${detectAppEnv()}"`);

    if (!planPrices[effectivePlanId]) {
      console.error(`[create-razorpay-order] Invalid plan ID received: ${JSON.stringify(planId)} (effective: "${effectivePlanId}"). Available keys: ${Object.keys(planPrices).join(', ')}`);
      return sendError(res, 400, `Invalid plan ID: "${planId}". Supported plans are: free, starter, pro, business.`);
    }

    // 3. Calculate Pricing (Server-side source of truth)
    const pricePerUser = planPrices[effectivePlanId][billingCycle];
    if (pricePerUser === undefined) {
      return sendError(res, 400, `Invalid billing cycle "${billingCycle}" for plan "${planId}".`);
    }
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
