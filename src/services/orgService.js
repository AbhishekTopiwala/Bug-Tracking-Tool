/**
 * orgService.js
 * Firestore service for the Organization Owner Portal.
 * Handles admin management, org-level project oversight,
 * team utilization, settings, billing, and audit logs.
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sendInviteEmail } from './mailService';
import { getCurrentOrgId } from './firestoreService';

// ── ORG DASHBOARD STATS ──────────────────────────────────────────────────────

/**
 * Fetch aggregated dashboard metrics for the organization.
 */
export async function getOrgDashboardStats(orgId) {
  const effectiveOrgId = orgId || getCurrentOrgId();

  const [usersSnap, projectsSnap, bugsSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('organizationId', '==', effectiveOrgId))),
    getDocs(query(collection(db, 'projects'), where('organizationId', '==', effectiveOrgId))),
    getDocs(query(collection(db, 'bugs'), where('organizationId', '==', effectiveOrgId))),
  ]);

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const bugs = bugsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const activeUsers = users.filter(u => u.isActive !== false);
  const admins = activeUsers.filter(u => ['Admin', 'Manager', 'org_admin'].includes(u.role));
  const qaEngineers = activeUsers.filter(u => u.role === 'QA');
  const developers = activeUsers.filter(u => u.role === 'Developer');
  const orgOwners = activeUsers.filter(u => u.role === 'OrgOwner');

  const activeProjects = projects.filter(p => p.status !== 'archived');
  const openDefects = bugs.filter(b => ['Open', 'Reopened', 'Reopen', 'In Progress'].includes(b.status));
  const closedDefects = bugs.filter(b => ['Closed', 'Done', 'Resolved'].includes(b.status));

  return {
    users, projects, bugs,
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    totalAdmins: admins.length,
    totalQA: qaEngineers.length,
    totalDevelopers: developers.length,
    totalOrgOwners: orgOwners.length,
    totalMembers: activeUsers.length,
    openDefects: openDefects.length,
    closedDefects: closedDefects.length,
    totalBugs: bugs.length,
    inactiveMembersCount: users.filter(u => u.isActive === false).length,
  };
}

// ── ADMIN MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * Get all admins/managers in the organization.
 */
export async function getOrgAdmins(orgId) {
  const effectiveOrgId = orgId || getCurrentOrgId();
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', effectiveOrgId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => ['Admin', 'Manager', 'org_admin', 'OrgOwner'].includes(u.role))
    .sort((a, b) => (a.email || '').localeCompare(b.email || ''));
}

/**
 * Get all team members (QA + Developers) in the organization.
 */
export async function getOrgTeamMembers(orgId) {
  const effectiveOrgId = orgId || getCurrentOrgId();
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', effectiveOrgId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.email || '').localeCompare(b.email || ''));
}

/**
 * Invite a new Admin/Manager to the organization.
 */
export async function inviteAdmin({ name, email, designation, department, permissionLevel, invitedBy, invitedByEmail, orgId }) {
  const effectiveOrgId = orgId || getCurrentOrgId();

  // Check for duplicate email in the org
  const existing = await getDocs(
    query(collection(db, 'users'), where('email', '==', email.toLowerCase()), where('organizationId', '==', effectiveOrgId))
  );
  if (!existing.empty) {
    throw new Error('A user with this email already exists in your organization.');
  }

  // Create placeholder user doc
  const docRef = await addDoc(collection(db, 'users'), {
    email: email.toLowerCase(),
    name,
    displayName: name,
    role: 'Admin',
    designation: designation || '',
    department: department || '',
    permissionLevel: permissionLevel || 'full',
    isActive: true,
    invited: true,
    invitedBy: invitedBy || 'Organization Owner',
    invitedByEmail: invitedByEmail || '',
    organizationId: effectiveOrgId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Log the audit event
  await createOrgAuditLog(effectiveOrgId, {
    actorName: invitedBy,
    actorEmail: invitedByEmail,
    action: 'INVITE_ADMIN',
    targetType: 'user',
    targetId: docRef.id,
    targetName: name,
    details: { email: email.toLowerCase(), role: 'Admin', department, designation },
  });

  // Send invitation email
  await sendInviteEmail(email, name, 'Admin', invitedBy, invitedByEmail);

  return docRef.id;
}

/**
 * Update an admin's profile.
 */
export async function updateAdmin(userId, data, actor) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');

  const prev = snap.data();
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  const orgId = prev.organizationId || getCurrentOrgId();
  await createOrgAuditLog(orgId, {
    actorName: actor?.displayName || actor?.name || 'System',
    actorEmail: actor?.email || '',
    action: 'UPDATE_ADMIN',
    targetType: 'user',
    targetId: userId,
    targetName: prev.displayName || prev.name || prev.email,
    details: data,
  });
}

/**
 * Deactivate an admin.
 */
export async function deactivateAdmin(userId, actor) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');

  const user = snap.data();
  await updateDoc(userRef, {
    isActive: false,
    is_active: false,
    deactivatedAt: serverTimestamp(),
  });

  const orgId = user.organizationId || getCurrentOrgId();
  await createOrgAuditLog(orgId, {
    actorName: actor?.displayName || 'System',
    actorEmail: actor?.email || '',
    action: 'DEACTIVATE_ADMIN',
    targetType: 'user',
    targetId: userId,
    targetName: user.displayName || user.name || user.email,
  });
}

/**
 * Activate a deactivated admin.
 */
export async function activateAdmin(userId, actor) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');

  const user = snap.data();
  await updateDoc(userRef, {
    isActive: true,
    is_active: true,
    reactivatedAt: serverTimestamp(),
  });

  const orgId = user.organizationId || getCurrentOrgId();
  await createOrgAuditLog(orgId, {
    actorName: actor?.displayName || 'System',
    actorEmail: actor?.email || '',
    action: 'ACTIVATE_ADMIN',
    targetType: 'user',
    targetId: userId,
    targetName: user.displayName || user.name || user.email,
  });
}

/**
 * Remove an admin from the organization.
 */
export async function removeAdmin(userId, actor) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');

  const user = snap.data();
  await updateDoc(userRef, {
    organizationId: null,
    removedFromOrg: true,
    isActive: false,
    is_active: false,
    removedAt: serverTimestamp(),
  });

  const orgId = user.organizationId || getCurrentOrgId();
  await createOrgAuditLog(orgId, {
    actorName: actor?.displayName || 'System',
    actorEmail: actor?.email || '',
    action: 'REMOVE_ADMIN',
    targetType: 'user',
    targetId: userId,
    targetName: user.displayName || user.name || user.email,
  });
}

// ── PROJECT OVERSIGHT ────────────────────────────────────────────────────────

/**
 * Get all projects with health metrics.
 */
export async function getOrgProjects(orgId) {
  const effectiveOrgId = orgId || getCurrentOrgId();
  const q = query(collection(db, 'projects'), where('organizationId', '==', effectiveOrgId));
  const snap = await getDocs(q);
  const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Fetch bugs for each project to compute health
  const bugsSnap = await getDocs(
    query(collection(db, 'bugs'), where('organizationId', '==', effectiveOrgId))
  );
  const allBugs = bugsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return projects.map(project => {
    const projectBugs = allBugs.filter(b => b.projectId === project.id);
    const openBugs = projectBugs.filter(b => ['Open', 'In Progress', 'Reopened', 'Reopen'].includes(b.status));
    const closedBugs = projectBugs.filter(b => ['Closed', 'Done', 'Resolved'].includes(b.status));
    const totalBugs = projectBugs.length;
    const completionPct = totalBugs > 0 ? Math.round((closedBugs.length / totalBugs) * 100) : 0;

    return {
      ...project,
      totalBugs,
      openBugs: openBugs.length,
      closedBugs: closedBugs.length,
      completionPct,
      teamSize: project.assignedUsers?.length || 0,
      health: openBugs.length > 10 ? 'critical' : openBugs.length > 5 ? 'at-risk' : 'healthy',
    };
  }).sort((a, b) => {
    const tA = a.createdAt?.seconds ?? 0;
    const tB = b.createdAt?.seconds ?? 0;
    return tB - tA;
  });
}

/**
 * Archive a project.
 */
export async function archiveProject(projectId, actor) {
  const projRef = doc(db, 'projects', projectId);
  const snap = await getDoc(projRef);
  if (!snap.exists()) throw new Error('Project not found');

  const project = snap.data();
  await updateDoc(projRef, {
    status: 'archived',
    archivedAt: serverTimestamp(),
    archivedBy: actor?.uid || 'system',
  });

  const orgId = project.organizationId || getCurrentOrgId();
  await createOrgAuditLog(orgId, {
    actorName: actor?.displayName || 'System',
    actorEmail: actor?.email || '',
    action: 'ARCHIVE_PROJECT',
    targetType: 'project',
    targetId: projectId,
    targetName: project.name,
  });
}

/**
 * Transfer project ownership.
 */
export async function transferProjectOwnership(projectId, newOwnerId, actor) {
  const projRef = doc(db, 'projects', projectId);
  const snap = await getDoc(projRef);
  if (!snap.exists()) throw new Error('Project not found');

  const project = snap.data();
  await updateDoc(projRef, {
    createdBy: newOwnerId,
    updatedAt: serverTimestamp(),
  });

  const orgId = project.organizationId || getCurrentOrgId();
  await createOrgAuditLog(orgId, {
    actorName: actor?.displayName || 'System',
    actorEmail: actor?.email || '',
    action: 'TRANSFER_PROJECT',
    targetType: 'project',
    targetId: projectId,
    targetName: project.name,
    details: { newOwnerId },
  });
}

// ── TEAM UTILIZATION ─────────────────────────────────────────────────────────

/**
 * Get team distribution per project.
 */
export async function getTeamDistribution(orgId) {
  const effectiveOrgId = orgId || getCurrentOrgId();

  const [usersSnap, projectsSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('organizationId', '==', effectiveOrgId))),
    getDocs(query(collection(db, 'projects'), where('organizationId', '==', effectiveOrgId))),
  ]);

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return projects.map(project => {
    const assigned = project.assignedUsers || [];
    const teamMembers = users.filter(u => assigned.includes(u.id) || assigned.includes(u.uid));

    return {
      projectId: project.id,
      projectName: project.name,
      totalAssigned: teamMembers.length,
      qaCount: teamMembers.filter(u => u.role === 'QA').length,
      devCount: teamMembers.filter(u => u.role === 'Developer').length,
      adminCount: teamMembers.filter(u => ['Admin', 'Manager'].includes(u.role)).length,
    };
  });
}

// ── ORGANIZATION SETTINGS ────────────────────────────────────────────────────

/**
 * Get organization settings.
 */
export async function getOrgSettings(orgId) {
  const effectiveOrgId = orgId || getCurrentOrgId();
  const snap = await getDoc(doc(db, 'organizations', effectiveOrgId));
  if (!snap.exists()) throw new Error('Organization not found');
  return { id: snap.id, ...snap.data() };
}

/**
 * Update organization settings.
 */
export async function updateOrgSettings(orgId, data, actor) {
  const effectiveOrgId = orgId || getCurrentOrgId();
  const orgRef = doc(db, 'organizations', effectiveOrgId);
  await updateDoc(orgRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  await createOrgAuditLog(effectiveOrgId, {
    actorName: actor?.displayName || 'System',
    actorEmail: actor?.email || '',
    action: 'UPDATE_SETTINGS',
    targetType: 'settings',
    targetId: effectiveOrgId,
    targetName: 'Organization Settings',
    details: Object.keys(data),
  });
}

// ── ORG AUDIT LOGS ───────────────────────────────────────────────────────────

/**
 * Create an org-level audit log entry.
 */
export async function createOrgAuditLog(orgId, data) {
  try {
    await addDoc(collection(db, 'org_audit_logs'), {
      organizationId: orgId,
      actorId: data.actorId || '',
      actorName: data.actorName || 'System',
      actorEmail: data.actorEmail || '',
      action: data.action,
      targetType: data.targetType || 'unknown',
      targetId: data.targetId || '',
      targetName: data.targetName || '',
      details: data.details || {},
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('[orgService] Error creating org audit log:', err);
  }
}

/**
 * Fetch org-level audit logs.
 */
export async function getOrgAuditLogs(orgId) {
  const effectiveOrgId = orgId || getCurrentOrgId();
  try {
    const q = query(
      collection(db, 'org_audit_logs'),
      where('organizationId', '==', effectiveOrgId),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('[orgService] Error fetching org audit logs:', err);
    return [];
  }
}

// ── REPORTS & ANALYTICS ──────────────────────────────────────────────────────

/**
 * Get defect trends for the organization (last 30 days).
 */
export function getDefectTrends(bugs) {
  const now = new Date();
  const days = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayBugs = bugs.filter(b => {
      const created = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : null;
      return created && created.toISOString().split('T')[0] === dateStr;
    });
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      opened: dayBugs.length,
      closed: dayBugs.filter(b => ['Closed', 'Done', 'Resolved'].includes(b.status)).length,
    });
  }
  return days;
}

/**
 * Get team productivity metrics.
 */
export function getTeamProductivity(users, bugs) {
  return users
    .filter(u => ['QA', 'Developer'].includes(u.role) && u.isActive !== false)
    .map(user => {
      const userId = user.id || user.uid;
      const assignedBugs = bugs.filter(b => b.assigneeId === userId || b.reportedBy === userId);
      const resolvedBugs = assignedBugs.filter(b => ['Closed', 'Done', 'Resolved'].includes(b.status));

      return {
        id: userId,
        name: user.displayName || user.name || user.email?.split('@')[0],
        role: user.role,
        email: user.email,
        totalBugs: assignedBugs.length,
        resolvedBugs: resolvedBugs.length,
        resolutionRate: assignedBugs.length > 0 ? Math.round((resolvedBugs.length / assignedBugs.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.resolvedBugs - a.resolvedBugs);
}

/**
 * Subscribe to real-time updates for org data.
 */
export function subscribeToOrgData(orgId, callback) {
  const effectiveOrgId = orgId || getCurrentOrgId();

  const unsubs = [];

  // Listen to users
  unsubs.push(onSnapshot(
    query(collection(db, 'users'), where('organizationId', '==', effectiveOrgId)),
    () => callback(),
    err => console.error('[orgService] Users listener error:', err)
  ));

  // Listen to projects
  unsubs.push(onSnapshot(
    query(collection(db, 'projects'), where('organizationId', '==', effectiveOrgId)),
    () => callback(),
    err => console.error('[orgService] Projects listener error:', err)
  ));

  // Listen to bugs
  unsubs.push(onSnapshot(
    query(collection(db, 'bugs'), where('organizationId', '==', effectiveOrgId)),
    () => callback(),
    err => console.error('[orgService] Bugs listener error:', err)
  ));

  return () => unsubs.forEach(fn => fn());
}
