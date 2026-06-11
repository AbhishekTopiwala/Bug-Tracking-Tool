import { auth, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { getCurrentOrgId } from './firestoreService';

async function fetchFromApi(endpoint, payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  // Hit the Vercel API (relative path works for same domain)
  const url = endpoint;

  const response = await fetch(url, {
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
    const orgId = getCurrentOrgId();
    console.log("Note:", note);
    console.log("Organization ID:", orgId);

    if (import.meta.env.MODE === 'development') {
      const fn = httpsCallable(functions, 'generateBugFromNote');
      const result = await fn({ note, organizationId: orgId });
      return result.data;
    } else {
      return await fetchFromApi('/api/generate-bug-from-note', {
        note,
        organizationId: orgId
      });
    }
  } catch (error) {
    console.error("Error calling generateBugFromNote:", error);
    throw error;
  }
}

export async function generateTestCases(featureDescription, imageBase64 = null, imageMimeType = null) {
  try {
    const orgId = getCurrentOrgId();
    if (import.meta.env.MODE === 'development') {
      const fn = httpsCallable(functions, 'generateTestCases');
      const result = await fn({ featureDescription, imageBase64, imageMimeType, organizationId: orgId });
      return result.data;
    } else {
      return await fetchFromApi('/api/generate-test-cases', {
        featureDescription,
        imageBase64,
        imageMimeType,
        organizationId: orgId
      });
    }
  } catch (error) {
    console.error("Error calling generateTestCases:", error);
    throw error;
  }
}

export async function suggestSimilarBugs(title, existingBugs) {
  if (!existingBugs || existingBugs.length === 0) return [];

  try {
    const orgId = getCurrentOrgId();
    if (import.meta.env.MODE === 'development') {
      const fn = httpsCallable(functions, 'suggestSimilarBugs');
      const result = await fn({ title, existingBugs, organizationId: orgId });
      return result.data;
    } else {
      return await fetchFromApi('/api/suggest-similar-bugs', {
        title,
        existingBugs,
        organizationId: orgId
      });
    }
  } catch (error) {
    console.error("Error calling suggestSimilarBugs:", error);
    throw error;
  }
}
