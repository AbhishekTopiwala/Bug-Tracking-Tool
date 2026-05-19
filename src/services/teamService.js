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
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sendInviteEmail } from './mailService';
import { getCurrentOrgId } from './firestoreService';

// ── Fetch all users ───────────────────────────────────────────────────────────

/**
 * Fetch every document in the `users` collection, ordered by creation date.
 * @returns {Promise<Array>}  Array of user objects (with `id` field injected).
 */
export async function fetchAllUsers() {
  const orgId = getCurrentOrgId();
  const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
  const snap = await getDocs(q);
  // Ensure the document ID (id) takes precedence over any 'id' field in the data
  // Sort in-memory to avoid needing a composite Firestore index on (organizationId + email)
  const users = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  return users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
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

import { createAuditLog } from './auditService';

/**
 * Set `isActive: false` and `is_active: false` on a user document.
 * Prefer this soft-delete over permanently removing the document so
 * historical bug data (assignedTo, etc.) continues to resolve correctly.
 *
 * @param {string} userId  Firestore document ID of the user.
 * @param {object} actor   The user performing this action.
 * @param {string} [reason] Optional reason for audit log.
 */
export async function deactivateUser(userId, actor = null, reason = 'Deactivated by administrator') {
  if (!userId) throw new Error('User ID is required for deactivation');
  console.log(`[teamService] Attempting to deactivate user: ${userId}`);
  
  const userRef = doc(db, 'users', userId);
  
  try {
    const userSnap = await getDoc(userRef);
    const targetUser = userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;

    const updatePayload = {
      isActive: false,
      is_active: false,
      deactivatedAt: serverTimestamp(),
      deactivated_at: serverTimestamp()
    };

    await updateDoc(userRef, updatePayload);
    
    // Log the audit event
    if (actor && targetUser) {
      await createAuditLog({
        actor,
        targetUser,
        action: 'DEACTIVATE',
        reason,
        isPermanent: false
      });
    }
    
    // Verification log
    const updatedSnap = await getDoc(userRef);
    console.log(`[teamService] User ${userId} status in DB after update:`, updatedSnap.data()?.isActive);
  } catch (error) {
    console.error(`[teamService] Error deactivating user ${userId}:`, error);
    throw error;
  }
}

// ── Activate a user ───────────────────────────────────────────────────────────

/**
 * Set `isActive: true` and `is_active: true` on a user document to restore their access.
 * @param {string} userId  Firestore document ID of the user.
 * @param {object} actor   The user performing this action.
 * @param {string} [reason] Optional reason for audit log.
 */
export async function activateUser(userId, actor = null, reason = 'Activated by administrator') {
  if (!userId) throw new Error('User ID is required for activation');
  console.log(`[teamService] Attempting to activate user: ${userId}`);
  
  const userRef = doc(db, 'users', userId);
  
  try {
    const userSnap = await getDoc(userRef);
    const targetUser = userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;

    const updatePayload = {
      isActive: true,
      is_active: true,
      reactivatedAt: serverTimestamp(),
      reactivated_at: serverTimestamp()
    };

    await updateDoc(userRef, updatePayload);

    // Log the audit event
    if (actor && targetUser) {
      await createAuditLog({
        actor,
        targetUser,
        action: 'ACTIVATE',
        reason,
        isPermanent: false
      });
    }

    // Verification log
    const updatedSnap = await getDoc(userRef);
    console.log(`[teamService] User ${userId} status in DB after update:`, updatedSnap.data()?.isActive);
  } catch (error) {
    console.error(`[teamService] Error activating user ${userId}:`, error);
    throw error;
  }
}

// ── Soft Delete a User ────────────────────────────────────────────────────────

/**
 * Soft delete a user: mark as deleted and deactivated.
 * @param {string} userId
 * @param {object} actor
 * @param {string} [reason]
 */
export async function softDeleteUser(userId, actor, reason = 'Soft deleted by administrator') {
  if (!userId) throw new Error('User ID is required for soft-delete');
  console.log(`[teamService] Attempting to soft-delete user: ${userId}`);

  const userRef = doc(db, 'users', userId);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User does not exist');
    const targetUser = { id: userSnap.id, ...userSnap.data() };

    const updatePayload = {
      isActive: false,
      is_active: false,
      isDeleted: true,
      is_deleted: true,
      deletedAt: serverTimestamp(),
      deleted_at: serverTimestamp(),
      deletedBy: actor?.uid || 'system',
      deleted_by: actor?.uid || 'system'
    };

    await updateDoc(userRef, updatePayload);

    await createAuditLog({
      actor,
      targetUser,
      action: 'SOFT_DELETE',
      reason,
      isPermanent: false
    });

    console.log(`[teamService] User ${userId} successfully soft-deleted.`);
  } catch (error) {
    console.error(`[teamService] Error soft-deleting user ${userId}:`, error);
    throw error;
  }
}

// ── Restore a Soft-Deleted User ─────────────────────────────────────────────────

/**
 * Restore a soft-deleted user back to active state.
 * @param {string} userId
 * @param {object} actor
 * @param {string} [reason]
 */
export async function restoreUser(userId, actor, reason = 'Account restored by administrator') {
  if (!userId) throw new Error('User ID is required for restore');
  console.log(`[teamService] Attempting to restore user: ${userId}`);

  const userRef = doc(db, 'users', userId);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User does not exist');
    const targetUser = { id: userSnap.id, ...userSnap.data() };

    const updatePayload = {
      isActive: true,
      is_active: true,
      isDeleted: false,
      is_deleted: false,
      deletedAt: null,
      deleted_at: null,
      deletedBy: null,
      deleted_by: null
    };

    await updateDoc(userRef, updatePayload);

    await createAuditLog({
      actor,
      targetUser,
      action: 'RESTORE',
      reason,
      isPermanent: false
    });

    console.log(`[teamService] User ${userId} successfully restored.`);
  } catch (error) {
    console.error(`[teamService] Error restoring user ${userId}:`, error);
    throw error;
  }
}

// ── Remove User from Company / Organization ─────────────────────────────────────

/**
 * Remove user from organization: nullify their organizationId, set archived/removed states.
 * @param {string} userId
 * @param {object} actor
 * @param {string} [reason]
 */
export async function removeUserFromOrg(userId, actor, reason = 'Removed from organization') {
  if (!userId) throw new Error('User ID is required to remove from organization');
  console.log(`[teamService] Attempting to remove user from organization: ${userId}`);

  const userRef = doc(db, 'users', userId);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User does not exist');
    const targetUser = { id: userSnap.id, ...userSnap.data() };

    const updatePayload = {
      organizationId: null,
      removedFromOrg: true,
      removed_from_org: true,
      archivedAt: serverTimestamp(),
      archived_at: serverTimestamp()
    };

    await updateDoc(userRef, updatePayload);

    await createAuditLog({
      actor,
      targetUser,
      action: 'REMOVE_FROM_ORG',
      reason,
      isPermanent: false
    });

    console.log(`[teamService] User ${userId} successfully removed from organization and archived.`);
  } catch (error) {
    console.error(`[teamService] Error removing user ${userId} from organization:`, error);
    throw error;
  }
}

// ── Permanently delete a user ──────────────────────────────────────────────────

/**
 * Permanently delete a user document from Firestore.
 * ONLY Superadmin is allowed to call this function.
 * @param {string} userId  Firestore document ID of the user.
 * @param {object} actor   The super admin executing this action.
 * @param {string} [reason]
 */
export async function deleteUser(userId, actor = null, reason = 'Permanently deleted by Super Admin') {
  if (!userId) throw new Error('User ID is required for deletion');
  console.log(`[teamService] Attempting to permanently delete user: ${userId}`);
  
  const userRef = doc(db, 'users', userId);
  try {
    const userSnap = await getDoc(userRef);
    const targetUser = userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;

    await deleteDoc(userRef);
    console.log(`[teamService] User ${userId} successfully deleted from Firestore.`);

    if (actor && targetUser) {
      await createAuditLog({
        actor,
        targetUser,
        action: 'PERMANENT_DELETE',
        reason,
        isPermanent: true
      });
    }
  } catch (error) {
    console.error(`[teamService] Error permanently deleting user ${userId}:`, error);
    throw error;
  }
}

// ── Global users retrieval for Super Admin ──────────────────────────────────────

/**
 * Retrieve all user profiles in the system across all organizations.
 * ONLY Super Admin should call this.
 * @returns {Promise<Array>}
 */
export async function fetchAllUsersGlobal() {
  try {
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (error) {
    console.error('[teamService] Error fetching global users:', error);
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
    email: email.toLowerCase(),
    name,
    role,
    isActive: true,
    invited: true,
    invitedBy,
    invitedByEmail,
    organizationId: getCurrentOrgId(),
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
