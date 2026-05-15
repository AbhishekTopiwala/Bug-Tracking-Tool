const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const { GoogleGenerativeAI } = require("@google/generative-ai");

initializeApp();
const db = getFirestore();

// Helper to check org quota (Placeholder for actual billing logic)
async function checkAndIncrementQuota(orgId) {
  if (!orgId) throw new HttpsError("unauthenticated", "Organization ID missing");

  const orgRef = db.collection("organizations").doc(orgId);
  const orgDoc = await orgRef.get();
  
  if (!orgDoc.exists) {
    // For migration purposes, if org doesn't exist, we allow it to pass or create it.
    // In production, throw error if not found.
    return true; 
  }

  const data = orgDoc.data();
  const usage = data.aiUsage || { currentUsage: 0, monthlyLimit: 50 };

  if (usage.currentUsage >= usage.monthlyLimit) {
    throw new HttpsError("resource-exhausted", "AI Generation quota exceeded for this organization.");
  }

  await orgRef.update({
    "aiUsage.currentUsage": usage.currentUsage + 1,
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
