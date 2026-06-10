import { auth } from '../firebase/config';
import { getCurrentOrgId } from './firestoreService';

async function fetchFromApi(endpoint, payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const url = import.meta.env.MODE === 'development' 
    ? `http://localhost:3000${endpoint}` // Or whatever the local Vercel dev port is
    : endpoint;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data.result || data;
}

export async function generateBugFromNote(note) {
  try {
    console.log("Note:", note);
    const orgId = getCurrentOrgId();
    console.log("Organization ID:", orgId);
    
    return await fetchFromApi('/api/generate-bug-from-note', {
      note,
      organizationId: orgId
    });
  } catch (error) {
    console.error("Error calling generateBugFromNote:", error);
    throw error;
  }
}

export async function generateTestCases(featureDescription, imageBase64 = null, imageMimeType = null) {
  try {
    return await fetchFromApi('/api/generate-test-cases', {
      featureDescription,
      imageBase64,
      imageMimeType,
      organizationId: getCurrentOrgId()
    });
  } catch (error) {
    console.error("Error calling generateTestCases:", error);
    throw error;
  }
}

export async function suggestSimilarBugs(title, existingBugs) {
  if (!existingBugs || existingBugs.length === 0) return [];

  try {
    return await fetchFromApi('/api/suggest-similar-bugs', {
      title,
      existingBugs,
      organizationId: getCurrentOrgId()
    });
  } catch (error) {
    console.error("Error calling suggestSimilarBugs:", error);
    throw error;
  }
}
