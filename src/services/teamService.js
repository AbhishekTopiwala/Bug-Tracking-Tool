/**
 * teamService.js
 * Firestore service functions for the Admin Team Management dashboard.
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Fetch all users ───────────────────────────────────────────────────────────

/**
 * Fetch every document in the `users` collection, ordered by creation date.
 * @returns {Promise<Array>}  Array of user objects (with `id` field injected).
 */
export async function fetchAllUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    isActive: false,
    deactivatedAt: serverTimestamp(),
  });
}

// ── Invite a new user ─────────────────────────────────────────────────────────

/**
 * Create a placeholder user document in the `users` collection.
 * In production you would pair this with a Firebase Auth invite email
 * (e.g. via a Cloud Function or Firebase Auth's `generateSignInWithEmailLink`).
 *
 * @param {{ email: string, name: string, role: string }} inviteData
 * @returns {Promise<string>} The new document ID.
 */
export async function inviteUser({ email, name, role }) {
  const docRef = await addDoc(collection(db, 'users'), {
    email,
    name,
    role,
    isActive: true,
    invited: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}
