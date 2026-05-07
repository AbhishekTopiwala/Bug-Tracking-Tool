import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateBugFromNote(note) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `You are a QA engineer assistant. Convert this short QA note into a formal bug report.

QA Note: "${note}"

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code block if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function generateTestCases(featureDescription) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `You are a QA engineer. Generate comprehensive test cases for this feature.

Feature: "${featureDescription}"

Respond ONLY with a valid JSON object (no markdown, no code blocks):
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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function suggestSimilarBugs(title, existingBugs) {
  if (!existingBugs || existingBugs.length === 0) return [];

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const bugList = existingBugs.slice(0, 20).map(b => `ID: ${b.id} | Title: ${b.title}`).join('\n');

  const prompt = `Given this new bug title: "${title}"
  
And these existing bugs:
${bugList}

Return ONLY a JSON array of IDs of the most similar bugs (max 3). Example: ["bug1", "bug2"]
If none are similar, return: []`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}
