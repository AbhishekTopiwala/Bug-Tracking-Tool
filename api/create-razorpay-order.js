import Razorpay from 'razorpay';
import { verifyFirebaseToken, sendError, setCorsHeaders } from './_geminiHelper.js';

// Configuration
function getRazorpayConfig() {
  // Use the exact environment variable names from .env
  return {
    keyId: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_TEST_KEY_ID || process.env.VITE_RAZORPAY_LIVE_KEY_ID,
    secret: process.env.RAZORPAY_SECRET || process.env.RAZORPAY_TEST_SECRET || process.env.RAZORPAY_LIVE_SECRET,
  };
}

const PLAN_PRICES = {
  free: { monthly: 1, yearly: 1 },
  pro: { monthly: 99, yearly: 79 },
  business: { monthly: 199, yearly: 159 }
};

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

    // TODO: We skip coupon validation here for simplicity since this is a test environment,
    // and just use the basePrice. In production, we would query the `coupons` collection.
    let finalAmount = basePrice;
    
    // Apply 18% tax
    const tax = Math.round(finalAmount * 0.18);
    const totalAmount = finalAmount + tax;

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
