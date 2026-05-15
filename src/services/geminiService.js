import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { getCurrentOrgId } from './firestoreService';

export async function generateBugFromNote(note) {
  const fn = httpsCallable(functions, 'generateBugFromNote');
  try {
    const result = await fn({ note, organizationId: getCurrentOrgId() });
    return result.data;
  } catch (error) {
    console.error("Error calling generateBugFromNote:", error);
    throw error;
  }
}

export async function generateTestCases(featureDescription, imageBase64 = null, imageMimeType = null) {
  const fn = httpsCallable(functions, 'generateTestCases');
  try {
    const result = await fn({ featureDescription, imageBase64, imageMimeType, organizationId: getCurrentOrgId() });
    return result.data;
  } catch (error) {
    console.error("Error calling generateTestCases:", error);
    throw error;
  }
}

export async function suggestSimilarBugs(title, existingBugs) {
  if (!existingBugs || existingBugs.length === 0) return [];

  const fn = httpsCallable(functions, 'suggestSimilarBugs');
  try {
    const result = await fn({ title, existingBugs, organizationId: getCurrentOrgId() });
    return result.data;
  } catch (error) {
    console.error("Error calling suggestSimilarBugs:", error);
    throw error;
  }
}
