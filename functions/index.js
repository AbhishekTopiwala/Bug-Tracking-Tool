const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Razorpay = require("razorpay");

const crypto = require("crypto");

initializeApp();
const db = getFirestore();

// Helper to check org quota
async function checkAndIncrementQuota(orgId) {
  if (!orgId) throw new HttpsError("unauthenticated", "Organization ID missing");

  const orgRef = db.collection("organizations").doc(orgId);
  const orgDoc = await orgRef.get();
  
  if (!orgDoc.exists) {
    return true; 
  }

  const data = orgDoc.data();
  // Reconcile and synchronize both subscription and legacy aiUsage schemas
  const sub = data.subscription || {};
  const currentUsage = typeof sub.aiUsed === 'number' ? sub.aiUsed : (data.aiUsage?.currentUsage || 0);
  const monthlyLimit = typeof sub.aiQuota === 'number' ? sub.aiQuota : (data.aiUsage?.monthlyLimit || 50);

  if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
    throw new HttpsError("resource-exhausted", "AI Generation quota exceeded for this organization.");
  }

  await orgRef.update({
    "subscription.aiUsed": currentUsage + 1,
    "aiUsage.currentUsage": currentUsage + 1,
    "aiUsage.monthlyLimit": monthlyLimit
  });

  return true;
}

// ── GEMINI FUNCTIONS ─────────────────────────────────────────────────────────
function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY;
} 

// Helper function to query Gemini with retry logic and fallback model mechanism
async function generateGeminiContentWithRetry(genAI, defaultModel, systemInstruction, contents, maxRetries = 3) {
  let currentModel = defaultModel;
  let delay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: currentModel,
        systemInstruction: systemInstruction
      });
      const result = await model.generateContent(contents);
      return result;
    } catch (error) {
      console.error(`[Gemini Attempt ${attempt}] Failed using model ${currentModel}:`, error);
      
      const status = error.status;
      const isTransient = status === 503 || status === 429 || error.message?.includes("experiencing high demand") || error.message?.includes("503") || error.message?.includes("429");
      
      if (isTransient && attempt < maxRetries) {
        // Toggle model to the other 2.5 flash model as a fallback
        if (currentModel === 'gemini-2.5-flash-lite') {
          currentModel = 'gemini-2.5-flash';
        } else {
          currentModel = 'gemini-2.5-flash-lite';
        }
        console.warn(`[Gemini Retry] Retrying in ${delay}ms with fallback model: ${currentModel}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      } else {
        throw error;
      }
    }
  }
}

// Securely check if the authenticated user belongs to the specified organization
async function validateUserOrg(authUid, organizationId) {
  if (!organizationId) {
    throw new HttpsError("invalid-argument", "Organization ID is required.");
  }
  const userDoc = await db.collection("users").doc(authUid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const userData = userDoc.data();
  const isSuper = userData.role === 'super_admin' || userData.role === 'Superadmin';
  if (!isSuper && userData.organizationId !== organizationId) {
    throw new HttpsError("permission-denied", "You do not belong to this organization.");
  }
}

exports.generateBugFromNote = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to generate bugs.");
  }
  
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new HttpsError("internal", "GEMINI_API_KEY not configured.");
  }

  const { note, organizationId } = request.data;
  
  if (!note || typeof note !== 'string') {
    throw new HttpsError("invalid-argument", "Note is required and must be a string.");
  }

  await validateUserOrg(request.auth.uid, organizationId);
  await checkAndIncrementQuota(organizationId);

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = `You are a QA engineer assistant. Convert the short QA note into a formal bug report.
Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "title": "Clear, concise bug title",
  "description": "Detailed description of the bug",
  "stepsToReproduce": ["Step 1", "Step 2", "Step 3"],
  "expectedResult": "What should happen",
  "actualResult": "What actually happens",
  "priority": "High"
}

Priority must be one of: Low, Medium, High, Critical`;

  try {
    const result = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash-lite',
      systemInstruction,
      `QA Note: "${note}"`
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new HttpsError("internal", "Failed to generate bug from note.");
  }
});

exports.generateTestCases = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to generate test cases.");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new HttpsError("internal", "GEMINI_API_KEY not configured.");
  }

  const { featureDescription, imageBase64, imageMimeType, organizationId } = request.data;

  await validateUserOrg(request.auth.uid, organizationId);
  await checkAndIncrementQuota(organizationId);

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = `You are a QA engineer. Generate comprehensive test cases for the provided feature description or image of a website page.
Analyze the image or description carefully to list:
- Positive flows (successful operations, standard user behavior)
- Negative flows (validation errors, wrong inputs, invalid operations)
- Edge cases (boundary conditions, state transitions, unusual interactions, performance limits)

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "positive": [
    {"id": "TC-P1", "title": "Test case title", "steps": ["Step 1", "Step 2"], "expected": "Expected result"}
  ],
  "negative": [
    {"id": "TC-N1", "title": "Test case title", "steps": ["Step 1", "Step 2"], "expected": "Expected result"}
  ],
  "edge": [
    {"id": "TC-E1", "title": "Test case title", "steps": ["Step 1", "Step 2"], "expected": "Expected result"}
  ]
}`;

  const contents = [];
  if (imageBase64 && imageMimeType) {
    contents.push({
      inlineData: {
        data: imageBase64,
        mimeType: imageMimeType
      }
    });
  }

  contents.push({
    text: featureDescription || "Generate test cases for this image."
  });

  try {
    const result = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash-lite',
      systemInstruction,
      contents
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new HttpsError("internal", "Failed to generate test cases.");
  }
});

exports.suggestSimilarBugs = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new HttpsError("internal", "GEMINI_API_KEY not configured.");
  }

  const { title, existingBugs, organizationId } = request.data;

  await validateUserOrg(request.auth.uid, organizationId);
  await checkAndIncrementQuota(organizationId);

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = `Given a new bug title, analyze the provided list of existing bugs and identify any that are highly similar or duplicates.
Return ONLY a JSON array containing the IDs of the most similar bugs (maximum 3). Example: ["bug1", "bug2"]
If no existing bugs are similar, return: []`;

  const bugList = (existingBugs || []).slice(0, 20).map(b => `ID: ${b.id} | Title: ${b.title}`).join('\n');

  try {
    const result = await generateGeminiContentWithRetry(
      genAI,
      'gemini-2.5-flash-lite',
      systemInstruction,
      `New bug title: "${title}"\n\nExisting bugs:\n${bugList}`
    );
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new HttpsError("internal", "Failed to suggest similar bugs.");
  }
});

// ── RAZORPAY & BILLING ──────────────────────────────────────────────────────
function getRazorpayConfig() {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  if (isEmulator) {
    return {
      keyId: process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID,
      secret: process.env.RAZORPAY_TEST_SECRET || process.env.RAZORPAY_SECRET,
      webhookSecret: process.env.RAZORPAY_TEST_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET,
    };
  }

  return {
    keyId: process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID,
    secret: process.env.RAZORPAY_LIVE_SECRET || process.env.RAZORPAY_SECRET,
    webhookSecret: process.env.RAZORPAY_LIVE_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET,
  };
}

// ── Create Razorpay Order (idempotent & secure) ──────────────────────────────
exports.createRazorpayOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

  const userId = request.auth.uid;
  const { planId, billingCycle, couponCode, currency = "INR", notes } = request.data;
  const { keyId, secret } = getRazorpayConfig();
  if (!keyId || !secret) throw new HttpsError("internal", "Razorpay not configured.");

  // Validation
  if (!planId || !billingCycle) {
    throw new HttpsError("invalid-argument", "Plan ID and billing cycle are required.");
  }
  if (planId !== "pro" && planId !== "business" && planId !== "free") {
    throw new HttpsError("invalid-argument", "Invalid plan ID.");
  }
  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    throw new HttpsError("invalid-argument", "Invalid billing cycle.");
  }

  const usersCount = request.data.usersCount || 1;

  // Calculate pricing on the server side
  const PLAN_PRICES = {
    free: { monthly: 1, yearly: 1 },
    pro: { monthly: 99, yearly: 79 },
    business: { monthly: 199, yearly: 159 }
  };
  const pricePerUser = PLAN_PRICES[planId][billingCycle];
  const months = billingCycle === "yearly" ? 12 : 1;
  const basePrice = pricePerUser * usersCount * months;

  // Validate and apply coupon
  let discount = 0;
  let finalAmount = basePrice;
  if (couponCode) {
    const couponSnap = await db.collection("coupons")
      .where("code", "==", couponCode.toUpperCase())
      .where("active", "==", true)
      .limit(1)
      .get();
    if (!couponSnap.empty) {
      const coupon = couponSnap.docs[0].data();
      const now = new Date();
      
      let expiresAt = null;
      if (coupon.expiresAt) {
        expiresAt = coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
      }
      
      const isExpired = expiresAt && expiresAt < now;
      const isLimitReached = coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit;
      
      if (!isExpired && !isLimitReached) {
        if (coupon.type === 'percent') {
          discount = Math.round(basePrice * (coupon.value / 100));
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else if (coupon.type === 'fixed') {
          discount = Math.min(coupon.value, basePrice);
        }
        finalAmount = basePrice - discount;
      }
    }
  }

  // Apply 18% tax
  const tax = Math.round(finalAmount * 0.18);
  const totalAmount = finalAmount + tax;

  // Idempotency: check if a PENDING order already exists for this user+plan
  const existingOrders = await db.collection("payments")
    .where("userId", "==", userId)
    .where("status", "==", "PENDING")
    .where("planId", "==", planId)
    .limit(1)
    .get();

  if (!existingOrders.empty) {
    const existing = existingOrders.docs[0].data();
    if (existing.razorpayOrderId) {
      console.log(`[createOrder] Returning existing order ${existing.razorpayOrderId}`);
      return { id: existing.razorpayOrderId, amount: Math.round(totalAmount * 100), currency };
    }
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency,
      receipt: `qua_${userId.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId,
        planId: planId || "unknown",
        billingCycle: billingCycle || "monthly",
        ...notes,
      },
    });

    // Record payment attempt in Firestore
    await db.collection("payments").add({
      userId,
      planId,
      billingCycle,
      razorpayOrderId: order.id,
      amount: totalAmount, // Securely calculated amount
      currency,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      webhookProcessed: false,
      attempts: 1,
      couponCode: couponCode || null,
    });

    return order;
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    throw new HttpsError("internal", "Failed to create payment order.");
  }
});

// ── Verify Payment & Activate Subscription (secure) ───────────────────────────
exports.verifyRazorpayPayment = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

  const userId = request.auth.uid;
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    workspaceName,
    gstNumber,
  } = request.data;

  const { secret } = getRazorpayConfig();
  if (!secret) throw new HttpsError("internal", "Razorpay not configured.");

  // Fetch the order from payments collection to verify ownership and amount
  const payQuery = await db.collection("payments")
    .where("razorpayOrderId", "==", razorpay_order_id)
    .limit(1)
    .get();

  if (payQuery.empty) {
    throw new HttpsError("not-found", "Payment order not found.");
  }

  const payDoc = payQuery.docs[0];
  const payData = payDoc.data();
  if (payData.userId !== userId) {
    throw new HttpsError("permission-denied", "Payment order does not belong to you.");
  }

  const planId = payData.planId;
  const billingCycle = payData.billingCycle;
  const amount = payData.amount;
  const couponCode = payData.couponCode || null;

  // Verify Razorpay signature
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSig !== razorpay_signature) {
    console.error(`[verifyPayment] Signature mismatch for order ${razorpay_order_id}`);
    throw new HttpsError("permission-denied", "Payment signature verification failed.");
  }

  // Check for duplicate payment processing
  const paymentRef = await db.collection("payments")
    .where("razorpayOrderId", "==", razorpay_order_id)
    .where("status", "==", "PAID")
    .limit(1)
    .get();

  if (!paymentRef.empty) {
    console.log(`[verifyPayment] Duplicate: payment ${razorpay_payment_id} already processed.`);
    return { success: true, duplicate: true };
  }

  // Fetch user document
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "User not found.");
  const userData = userDoc.data();

  const PLAN_CONFIG = {
    free:       { aiQuota: 30, maxUsers: 5, maxProjects: 2 },
    pro:        { aiQuota: -1, maxUsers: -1, maxProjects: 10 },
    business:   { aiQuota: -1, maxUsers: -1, maxProjects: 20 },
    enterprise: { aiQuota: -1, maxUsers: -1, maxProjects: -1 },
  };
  const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG.pro;

  // Use Firestore batch for atomic multi-document write
  const batch = db.batch();

  let orgId = userData.organizationId;
  const isUpgrade = !!orgId;
  const orgRef = isUpgrade ? db.collection("organizations").doc(orgId) : db.collection("organizations").doc();
  if (!orgId) orgId = orgRef.id;

  const now = new Date();
  const periodEnd = billingCycle === "yearly"
    ? new Date(now.setFullYear(now.getFullYear() + 1))
    : new Date(now.setMonth(now.getMonth() + 1));

  const subscriptionDetails = {
    plan: planId,
    status: "ACTIVE",
    billingCycle,
    startDate: new Date().toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    autoRenew: true,
    aiQuota: planConfig.aiQuota,
    aiUsed: 0,
    maxUsers: planConfig.maxUsers,
    maxProjects: planConfig.maxProjects,
    lastPaymentId: razorpay_payment_id,
    lastPaymentAt: new Date().toISOString(),
    resetDate: periodEnd.toISOString(),
  };

  if (isUpgrade) {
    batch.update(orgRef, {
      subscription: subscriptionDetails,
      gstNumber: gstNumber || null,
    });
  } else {
    batch.set(orgRef, {
      name: workspaceName || (userData.displayName + "'s Workspace"),
      ownerId: userId,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      subscription: subscriptionDetails,
      gstNumber: gstNumber || null,
      country: userData.country || "India",
    });
  }

  // Update user document
  batch.update(db.collection("users").doc(userId), {
    organizationId: orgId,
    paymentStatus: "PAID",
    subscriptionStatus: "ACTIVE",
    planId,
    billingCycle,
    updatedAt: new Date().toISOString(),
    pendingOrderId: null,
    pendingPlanId: null,
    pendingBillingCycle: null,
  });

  // Update the pending payment document
  batch.update(payDoc.ref, {
    organizationId: orgId,
    status: "PAID",
    razorpayPaymentId: razorpay_payment_id,
    updatedAt: new Date().toISOString(),
  });

  // Create invoice record
  const invoiceNumber = `QUA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const invoiceRef = db.collection("invoices").doc();
  batch.set(invoiceRef, {
    userId,
    organizationId: orgId,
    invoiceNumber,
    paymentId: payDoc.id,
    planId,
    billingCycle,
    amount,
    currency: "INR",
    gstNumber: gstNumber || null,
    status: "ISSUED",
    issuedAt: new Date().toISOString(),
    periodStart: new Date().toISOString(),
    periodEnd: periodEnd.toISOString(),
    email: userData.email,
  });

  // Audit log
  const auditRef = db.collection("audit_logs").doc();
  batch.set(auditRef, {
    userId,
    action: isUpgrade ? "PLAN_UPGRADED" : "PAYMENT_VERIFIED_AND_ORG_CREATED",
    details: {
      planId, billingCycle, orgId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount,
    },
    timestamp: new Date().toISOString(),
  });

  await batch.commit();

  console.log(`[verifyPayment] SUCCESS: org=${orgId}, user=${userId}, plan=${planId}`);
  return { success: true, organizationId: orgId, invoiceNumber };
});

// ── Activate Free Plan Cloud Function (secure) ────────────────────────────────
exports.activateFreePlan = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

  const userId = request.auth.uid;
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "User not found.");
  const userData = userDoc.data();

  let orgId = userData.organizationId;
  const isUpgrade = !!orgId;
  const orgRef = isUpgrade ? db.collection("organizations").doc(orgId) : db.collection("organizations").doc();
  if (!orgId) orgId = orgRef.id;

  const batch = db.batch();
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
      name: userData.workspaceName || (userData.displayName + "'s Workspace"),
      ownerId: userId,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      subscription: subscriptionDetails,
    });
  }

  batch.update(db.collection("users").doc(userId), {
    organizationId: orgId,
    planId: 'free',
    paymentStatus: 'NOT_REQUIRED',
    subscriptionStatus: 'ACTIVE',
    updatedAt: new Date().toISOString(),
  });

  // Audit log
  const auditRef = db.collection("audit_logs").doc();
  batch.set(auditRef, {
    userId,
    action: isUpgrade ? "PLAN_DOWNGRADED_TO_FREE" : "FREE_PLAN_ACTIVATED",
    details: { planId: 'free', orgId },
    timestamp: new Date().toISOString(),
  });

  await batch.commit();
  return { success: true, organizationId: orgId };
});

// ── Secure Server-Side Audit Log Cloud Function (secure) ──────────────────────
exports.createAuditLog = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

  const { action, targetUser, reason, isPermanent, details } = request.data;
  
  const actorUid = request.auth.uid;
  const actorDoc = await db.collection("users").doc(actorUid).get();
  const actorData = actorDoc.exists ? actorDoc.data() : null;

  const logData = {
    action,
    actor: {
      uid: actorUid,
      email: actorData?.email || request.auth.token.email || 'unknown',
      name: actorData?.displayName || actorData?.name || 'Unknown',
      role: actorData?.role || 'user',
    },
    targetUser: {
      uid: targetUser?.uid || targetUser?.id || '',
      email: targetUser?.email || '',
      name: targetUser?.name || targetUser?.displayName || '',
      role: targetUser?.role || '',
      organizationId: targetUser?.organizationId || '',
    },
    reason: reason || 'No reason provided',
    isPermanent: !!isPermanent,
    details: details || {},
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  await db.collection("audit_logs").add(logData);
  return { success: true };
});

// ── Secure Razorpay Webhook ───────────────────────────────────────────────────
exports.razorpayWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const signature = req.headers["x-razorpay-signature"];
  const rawBody = JSON.stringify(req.body);

  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) {
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET not configured");
    return res.status(500).send("Server configuration error");
  }

  // Verify webhook signature
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSig) {
    console.warn("[Webhook] Signature mismatch — rejected");
    return res.status(400).send("Invalid signature");
  }

  const event = req.body.event;
  const eventId = req.body.account_id + "_" + event + "_" + (req.body.payload?.payment?.entity?.id || Date.now());

  // Idempotency: check if this event was already processed
  const existingLog = await db.collection("webhook_logs")
    .where("eventId", "==", eventId)
    .limit(1).get();

  if (!existingLog.empty) {
    console.log(`[Webhook] Duplicate event ${eventId} — skipping`);
    return res.json({ status: "ok", duplicate: true });
  }

  // Log webhook
  await db.collection("webhook_logs").add({
    eventId,
    event,
    payload: req.body,
    receivedAt: new Date().toISOString(),
    processed: false,
  });

  try {
    const payment = req.body.payload?.payment?.entity;

    if (event === "payment.captured") {
      const orderId = payment?.order_id;
      if (orderId) {
        const payQ = await db.collection("payments")
          .where("razorpayOrderId", "==", orderId).limit(1).get();
        if (!payQ.empty) {
          await payQ.docs[0].ref.update({
            status: "PAID",
            webhookProcessed: true,
            razorpayPaymentId: payment.id,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (event === "payment.failed") {
      const orderId = payment?.order_id;
      if (orderId) {
        const payQ = await db.collection("payments")
          .where("razorpayOrderId", "==", orderId).limit(1).get();
        if (!payQ.empty) {
          const payData = payQ.docs[0].data();
          await payQ.docs[0].ref.update({
            status: "FAILED",
            failureReason: payment?.error_description,
            updatedAt: new Date().toISOString(),
          });
          if (payData.userId) {
            await db.collection("users").doc(payData.userId).update({
              paymentStatus: "FAILED",
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    if (event === "refund.processed") {
      const refund = req.body.payload?.refund?.entity;
      const paymentId = refund?.payment_id;
      if (paymentId) {
        const payQ = await db.collection("payments")
          .where("razorpayPaymentId", "==", paymentId).limit(1).get();
        if (!payQ.empty) {
          const payData = payQ.docs[0].data();
          await payQ.docs[0].ref.update({
            status: "REFUNDED",
            refundId: refund.id,
            refundAmount: refund.amount / 100,
            updatedAt: new Date().toISOString(),
          });
          if (payData.userId) {
            await db.collection("users").doc(payData.userId).update({
              paymentStatus: "REFUNDED",
              subscriptionStatus: "CANCELLED",
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Mark webhook as processed
    const logsQ = await db.collection("webhook_logs")
      .where("eventId", "==", eventId).limit(1).get();
    if (!logsQ.empty) {
      await logsQ.docs[0].ref.update({ processed: true, processedAt: new Date().toISOString() });
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook] Processing error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── SCHEDULERS ──────────────────────────────────────────────────────────────
// Reset AI quota on the 1st of every month at midnight
exports.resetMonthlyQuota = onSchedule("0 0 1 * *", async (event) => {
  console.log("Starting monthly quota reset...");
  const orgsSnap = await db.collection("organizations").get();
  
  const batch = db.batch();
  orgsSnap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      "subscription.aiUsed": 0,
      "aiUsage.currentUsage": 0,
      "aiUsage.lastResetAt": new Date().toISOString()
    });
  });

  await batch.commit();
  console.log(`Successfully reset quotas for ${orgsSnap.size} organizations.`);
});
