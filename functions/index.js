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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

exports.generateBugFromNote = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to generate bugs.");
  }
  
  if (!GEMINI_API_KEY) {
    throw new HttpsError("internal", "GEMINI_API_KEY not configured.");
  }

  const { note, organizationId } = request.data;
  
  // Phase 4: Quota checking (Optional for now, but implemented as architecture specifies)
  if (organizationId) {
     await checkAndIncrementQuota(organizationId);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `You are a QA engineer assistant. Convert the short QA note into a formal bug report.
Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "title": "Clear, concise bug title",
  "description": "Detailed description of the bug",
  "stepsToReproduce": ["Step 1", "Step 2", "Step 3"],
  "expectedResult": "What should happen",
  "actualResult": "What actually happens",
  "priority": "High"
}

Priority must be one of: Low, Medium, High, Critical`
  });

  try {
    const result = await model.generateContent(`QA Note: "${note}"`);
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

  if (!GEMINI_API_KEY) {
    throw new HttpsError("internal", "GEMINI_API_KEY not configured.");
  }

  const { featureDescription, imageBase64, imageMimeType, organizationId } = request.data;

  if (organizationId) {
     await checkAndIncrementQuota(organizationId);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `You are a QA engineer. Generate comprehensive test cases for the provided feature description or image of a website page.
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
}`
  });

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
    const result = await model.generateContent(contents);
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

  if (!GEMINI_API_KEY) {
    throw new HttpsError("internal", "GEMINI_API_KEY not configured.");
  }

  const { title, existingBugs, organizationId } = request.data;

  // We might not increment quota for just a suggestSimilarBugs call, or we could.
  // Assuming we do.
  if (organizationId) {
     await checkAndIncrementQuota(organizationId);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `Given a new bug title, analyze the provided list of existing bugs and identify any that are highly similar or duplicates.
Return ONLY a JSON array containing the IDs of the most similar bugs (maximum 3). Example: ["bug1", "bug2"]
If no existing bugs are similar, return: []`
  });

  const bugList = (existingBugs || []).slice(0, 20).map(b => `ID: ${b.id} | Title: ${b.title}`).join('\n');

  try {
    const result = await model.generateContent(`New bug title: "${title}"\n\nExisting bugs:\n${bugList}`);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new HttpsError("internal", "Failed to suggest similar bugs.");
  }
});

// ── RAZORPAY & BILLING ──────────────────────────────────────────────────────
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

exports.createRazorpayOrder = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const { amount, currency = "INR" } = request.data;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_SECRET) {
    throw new HttpsError("internal", "Razorpay not configured.");
  }

  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_SECRET,
  });

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    });
    return order;
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    throw new HttpsError("internal", "Failed to create Razorpay order.");
  }
});

exports.razorpayWebhook = onRequest(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const body = JSON.stringify(req.body);

  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error("WEBHOOK_SECRET not configured");
    return res.status(500).send("Internal Configuration Error");
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.warn("Invalid webhook signature");
    return res.status(400).send("Invalid Signature");
  }

  const event = req.body.event;
  console.log(`Received Razorpay event: ${event}`);

  if (event === "payment.captured") {
    const payment = req.body.payload.payment.entity;
    const { order_id, email, notes } = payment;
    const orgId = notes?.organizationId;

    if (orgId) {
      // Update subscription in Firestore
      await db.collection("organizations").doc(orgId).update({
        "subscription.status": "active",
        "subscription.lastPaymentId": payment.id,
        "subscription.updatedAt": new Date().toISOString(),
      });
      console.log(`Successfully updated subscription for org: ${orgId}`);
    }
  }

  res.json({ status: "ok" });
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
