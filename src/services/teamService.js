/**
 * teamService.js
 * Firestore service functions for the Admin Team Management dashboard.
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sendInviteEmail } from './mailService';

// ── Fetch all users ───────────────────────────────────────────────────────────

/**
 * Fetch every document in the `users` collection, ordered by creation date.
 * @returns {Promise<Array>}  Array of user objects (with `id` field injected).
 */
export async function fetchAllUsers() {
  const q = query(collection(db, 'users'), orderBy('email', 'asc'));
  const snap = await getDocs(q);
  // Ensure the document ID (id) takes precedence over any 'id' field in the data
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

// ── Update a user's role ──────────────────────────────────────────────────────

/**
 * Update the `role` field on a user document.
 * @param {string} userId   Firestore document ID of the user.
 * @param {string} newRole  One of 'QA', 'Developer', or 'Admin'.
 */
export async function updateUserRole(userId, newRole) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
}

// ── Deactivate a user ─────────────────────────────────────────────────────────

/**
 * Set `isActive: false` on a user document so they can no longer log in.
 * Prefer this soft-delete over permanently removing the document so
 * historical bug data (assignedTo, etc.) continues to resolve correctly.
 *
 * @param {string} userId  Firestore document ID of the user.
 */
export async function deactivateUser(userId) {
  if (!userId) throw new Error('User ID is required for deactivation');
  console.log(`[teamService] Attempting to deactivate user: ${userId}`);
  
  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      isActive: false,
      deactivatedAt: serverTimestamp(),
    });
    
    // Verification log
    const updatedSnap = await getDoc(userRef);
    console.log(`[teamService] User ${userId} status in DB after update:`, updatedSnap.data()?.isActive);
    
    if (updatedSnap.data()?.isActive === true) {
      console.warn(`[teamService] Warning: User ${userId} is still active in DB despite successful update call!`);
    } else {
      console.log(`[teamService] User ${userId} successfully deactivated in Firestore.`);
    }
  } catch (error) {
    console.error(`[teamService] Error deactivating user ${userId}:`, error);
    throw error;
  }
}

// ── Activate a user ───────────────────────────────────────────────────────────

/**
 * Set `isActive: true` on a user document to restore their access.
 * @param {string} userId  Firestore document ID of the user.
 */
export async function activateUser(userId) {
  if (!userId) throw new Error('User ID is required for activation');
  console.log(`[teamService] Attempting to activate user: ${userId}`);
  
  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      isActive: true,
      reactivatedAt: serverTimestamp(),
    });
    
    // Verification log
    const updatedSnap = await getDoc(userRef);
    console.log(`[teamService] User ${userId} status in DB after update:`, updatedSnap.data()?.isActive);
  } catch (error) {
    console.error(`[teamService] Error activating user ${userId}:`, error);
    throw error;
  }
}


/**
 * Create a placeholder user document in the `users` collection and send an invitation email.
 *
 * @param {{ email: string, name: string, role: string, invitedBy?: string, invitedByEmail?: string }} inviteData
 * @returns {Promise<string>} The new document ID.
 */
export async function inviteUser({ email, name, role, invitedBy = 'Admin', invitedByEmail = '' }) {
  const docRef = await addDoc(collection(db, 'users'), {
    email,
    name,
    role,
    isActive: true,
    invited: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Send invitation email
  await sendInviteEmail(email, name, role, invitedBy, invitedByEmail);

  return docRef.id;
}

// ── Check if user has active bugs ─────────────────────────────────────────────

/**
 * Checks if a user is assigned to any bugs that are not yet resolved/closed.
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
export async function checkUserHasBugs(userId, userUid) {
  if (!userId && !userUid) return false;

  const identifiers = Array.from(new Set([userId, userUid].filter(Boolean)));
  if (identifiers.length === 0) return false;

  console.log(`Checking bugs for identifiers: ${identifiers.join(', ')}`);

  // We query by assigneeId. In most cases this is the UID or document ID.
  const q = query(
    collection(db, 'bugs'),
    where('assigneeId', 'in', identifiers)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log('No bugs found for this user.');
    return false;
  }

  // Actual statuses used in the app
  const activeStatuses = ['Open', 'In Progress', 'Reopen', 'Reopened', 'Reproduced'];
  
  const activeBugs = snap.docs.filter(d => {
    const status = d.data().status;
    return activeStatuses.includes(status);
  });

  if (activeBugs.length > 0) {
    console.log(`Found ${activeBugs.length} active bugs for user.`);
    return true;
  }

  console.log('User has bugs, but none are in an active status.');
  return false;
}

/**
 * Checks if a user is assigned to any active projects.
 * @param {string} userId 
 * @param {string} userUid 
 * @returns {Promise<boolean>}
 */
export async function checkUserHasProjects(userId, userUid) {
  if (!userId && !userUid) return false;
  const identifiers = Array.from(new Set([userId, userUid].filter(Boolean)));
  
  console.log(`Checking project assignments for: ${identifiers.join(', ')}`);

  const q = query(
    collection(db, 'projects'),
    where('assignedUsers', 'array-contains-any', identifiers)
  );

  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log(`User is assigned to ${snap.size} projects.`);
    return true;
  }

  console.log('User has no project assignments.');
  return false;
}
