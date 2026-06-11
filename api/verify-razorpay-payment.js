import crypto from 'crypto';
import { verifyFirebaseToken, sendError, setCorsHeaders } from './_geminiHelper.js';

function getRazorpayConfig() {
  return {
    secret: process.env.RAZORPAY_SECRET || process.env.RAZORPAY_TEST_SECRET || process.env.RAZORPAY_LIVE_SECRET,
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
      return sendError(res, 401, 'Unauthorized');
    }
    const idToken = authHeader.split('Bearer ')[1];
    await verifyFirebaseToken(idToken);

    // 2. Parse payload
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, 400, 'Missing Razorpay parameters');
    }

    // 3. Verify Signature
    const { secret } = getRazorpayConfig();
    if (!secret) {
      console.error("Razorpay secret missing in environment variables.");
      return sendError(res, 500, 'Razorpay not configured');
    }

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      console.error(`[verifyPayment] Signature mismatch for order ${razorpay_order_id}`);
      return sendError(res, 403, 'Payment signature verification failed.');
    }

    // Since we verified the signature successfully, return success.
    // The frontend is responsible for updating the Firestore documents
    // (users, payments, organizations, invoices, audit_logs) as per the new security rules.
    return res.status(200).json({ result: { data: { success: true } } });

  } catch (error) {
    console.error("verify-razorpay-payment error:", error);
    return sendError(res, 500, error.message || 'Failed to verify payment');
  }
}
