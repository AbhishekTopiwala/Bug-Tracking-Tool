import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateBugFromNote(note) {
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

  const result = await model.generateContent(`QA Note: "${note}"`);
  const text = result.response.text().trim();

  // Strip markdown code block if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function generateTestCases(featureDescription, imageBase64 = null, imageMimeType = null) {
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

  const result = await model.generateContent(contents);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function suggestSimilarBugs(title, existingBugs) {
  if (!existingBugs || existingBugs.length === 0) return [];

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: `Given a new bug title, analyze the provided list of existing bugs and identify any that are highly similar or duplicates.
Return ONLY a JSON array containing the IDs of the most similar bugs (maximum 3). Example: ["bug1", "bug2"]
If no existing bugs are similar, return: []`
  });

  const bugList = existingBugs.slice(0, 20).map(b => `ID: ${b.id} | Title: ${b.title}`).join('\n');

  const result = await model.generateContent(`New bug title: "${title}"\n\nExisting bugs:\n${bugList}`);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

