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

  if (currentUsage >= monthlyLimit) {
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
// Using a generic API key variable. In production, use Firebase Secret Manager.
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

exports.generateBugFromNote = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to generate bugs.");
  }
  
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new HttpsError("internal", "GEMINI_API_KEY not configured.");
  }

  const { note, organizationId } = request.data;
  
  // Phase 4: Quota checking (Optional for now, but implemented as architecture specifies)
  if (organizationId) {
     await checkAndIncrementQuota(organizationId);
  }

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

  if (organizationId) {
     await checkAndIncrementQuota(organizationId);
  }

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

  if (organizationId) {
     await checkAndIncrementQuota(organizationId);
  }

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
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    secret: process.env.RAZORPAY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  };
}

// ── Create Razorpay Order (idempotent) ───────────────────────────────────────
exports.createRazorpayOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

  const { amount, currency = "INR", planId, billingCycle, userId, notes } = request.data;
  const { keyId, secret } = getRazorpayConfig();
  if (!keyId || !secret) throw new HttpsError("internal", "Razorpay not configured.");

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
      return { id: existing.razorpayOrderId, amount: amount * 100, currency };
    }
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
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
      amount,
      currency,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      webhookProcessed: false,
      attempts: 1,
    });

    return order;
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    throw new HttpsError("internal", "Failed to create payment order.");
  }
});

// ── Verify Payment & Activate Subscription ────────────────────────────────────
// CRITICAL: This is the single source of truth. The frontend NEVER activates
// a subscription — only this verified backend function does.
exports.verifyRazorpayPayment = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    planId,
    billingCycle,
    workspaceName,
    gstNumber,
    couponCode,
    amount,
  } = request.data;

  const { secret } = getRazorpayConfig();
  if (!secret) throw new HttpsError("internal", "Razorpay not configured.");

  // 1. Verify Razorpay signature (anti-tampering)
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSig !== razorpay_signature) {
    console.error(`[verifyPayment] Signature mismatch for order ${razorpay_order_id}`);
    throw new HttpsError("permission-denied", "Payment signature verification failed.");
  }

  // 2. Check for duplicate webhook/verification (idempotency)
  const paymentRef = await db.collection("payments")
    .where("razorpayOrderId", "==", razorpay_order_id)
    .where("status", "==", "PAID")
    .limit(1)
    .get();

  if (!paymentRef.empty) {
    console.log(`[verifyPayment] Duplicate: payment ${razorpay_payment_id} already processed.`);
    return { success: true, duplicate: true };
  }

  // 3. Fetch user document
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) throw new HttpsError("not-found", "User not found.");
  const userData = userDoc.data();

  // 4. Prevent duplicate subscription (user already has PAID status)
  if (userData.paymentStatus === "PAID") {
    console.log(`[verifyPayment] User ${userId} already has PAID status — skipping.`);
    return { success: true, duplicate: true };
  }

  const PLAN_CONFIG = {
    free:       { aiQuota: 50, maxUsers: 1, maxProjects: 2 },
    starter:    { aiQuota: 500, maxUsers: 5, maxProjects: 10 },
    growth:     { aiQuota: 2000, maxUsers: 25, maxProjects: -1 },
    enterprise: { aiQuota: -1, maxUsers: -1, maxProjects: -1 },
  };
  const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG.starter;

  // 5. Use Firestore batch for atomic multi-document write
  const batch = db.batch();

  // 5a. Create Organization (ONLY after successful payment)
  const orgRef = db.collection("organizations").doc();
  const orgId = orgRef.id;
  const now = new Date();
  const periodEnd = billingCycle === "yearly"
    ? new Date(now.setFullYear(now.getFullYear() + 1))
    : new Date(now.setMonth(now.getMonth() + 1));

  batch.set(orgRef, {
    name: workspaceName || (userData.displayName + "'s Workspace"),
    ownerId: userId,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    subscription: {
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
    },
    gstNumber: gstNumber || null,
    country: userData.country || "India",
  });

  // 5b. Update user document
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

  // 5c. Create payment record
  const invoiceNumber = `QUA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const paymentDocRef = db.collection("payments").doc();
  batch.set(paymentDocRef, {
    userId,
    organizationId: orgId,
    planId,
    billingCycle,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    amount,
    currency: "INR",
    gstNumber: gstNumber || null,
    status: "PAID",
    invoiceNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    webhookProcessed: false,
    couponCode: couponCode || null,
  });

  // 5d. Create invoice record
  const invoiceRef = db.collection("invoices").doc();
  batch.set(invoiceRef, {
    userId,
    organizationId: orgId,
    invoiceNumber,
    paymentId: paymentDocRef.id,
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

  // 5e. Audit log
  const auditRef = db.collection("audit_logs").doc();
  batch.set(auditRef, {
    userId,
    action: "PAYMENT_VERIFIED_AND_ORG_CREATED",
    details: {
      planId, billingCycle, orgId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount,
    },
    timestamp: new Date().toISOString(),
  });

  // 6. Commit all writes atomically
  await batch.commit();

  console.log(`[verifyPayment] SUCCESS: org=${orgId}, user=${userId}, plan=${planId}`);
  return { success: true, organizationId: orgId, invoiceNumber };
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
