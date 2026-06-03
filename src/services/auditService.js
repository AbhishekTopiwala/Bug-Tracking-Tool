/**
 * auditService.js
 * Centered service for logging system audit logs, deletion events, and user modifications.
 */

import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';

/**
 * Creates an audit log entry in Firestore.
 * 
 * @param {object} params
 * @param {object} params.actor { uid, email, name, role }
 * @param {object} params.targetUser { uid, email, name, role, organizationId }
 * @param {string} params.action e.g., 'DEACTIVATE', 'ACTIVATE', 'SOFT_DELETE', 'PERMANENT_DELETE', 'RESTORE', 'REMOVE_FROM_ORG', 'ROLE_CHANGE'
 * @param {string} params.reason Reason given by the administrator.
 * @param {boolean} params.isPermanent Whether the operation is permanent.
 * @param {object} [params.details] Any additional JSON metadata.
 */
export async function createAuditLog({ actor, targetUser, action, reason, isPermanent = false, details = {} }) {
  try {
    console.log(`[auditService] Sending audit log request for ${action}`);
    const createAuditLogCF = httpsCallable(functions, 'createAuditLog');
    await createAuditLogCF({
      action,
      targetUser: {
        uid: targetUser?.uid || targetUser?.id || '',
        email: targetUser?.email || '',
        name: targetUser?.name || targetUser?.displayName || '',
        role: targetUser?.role || '',
        organizationId: targetUser?.organizationId || '',
      },
      reason: reason || 'No reason provided',
      isPermanent,
      details,
    });
  } catch (error) {
    console.error('[auditService] Error writing audit log via Cloud Function:', error);
  }
}

/**
 * Retrieves all system audit logs sorted by timestamp descending.
 * @returns {Promise<Array>}
 */
export async function fetchAuditLogs() {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Format timestamps for UI rendering if already loaded
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date()
    }));
  } catch (error) {
    console.error('[auditService] Error fetching audit logs:', error);
    throw error;
  }
}
