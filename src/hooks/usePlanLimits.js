/**
 * usePlanLimits.js
 * Central hook for enforcing plan-based limits across the application.
 *
 * Reads the organization subscription doc from Firestore and exposes:
 *  - canAddProject()      — checks project count against plan limit
 *  - canAddUser()         — checks user count against plan limit
 *  - canUseAI()           — checks monthly AI usage against quota
 *  - incrementAIUsage()   — atomically bumps the org's aiUsed counter
 *  - planName             — human-readable plan name
 *  - usage                — { projects, users, aiUsed, aiQuota, maxProjects, maxUsers }
 */

import { useState, useEffect, useCallback } from 'react';
import {
  doc, getDocs, collection, query, where, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PLANS } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves plan limits from PLANS constant using a planId.
 * Falls back to free plan limits if planId is unknown.
 */
function getPlanLimits(planId) {
  return PLANS[planId] || PLANS.free;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePlanLimits() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [subscription, setSubscription] = useState(null);
  const [projectCount, setProjectCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loadingLimits, setLoadingLimits] = useState(true);

  // Real-time listener for org subscription + one-time fetch for counts
  useEffect(() => {
    if (!orgId) return;

    setLoadingLimits(true);

    // 1. Real-time listener on the org doc so aiUsed updates instantly
    //    whenever the backend Cloud Function increments it.
    const unsubOrg = onSnapshot(
      doc(db, 'organizations', orgId),
      (snap) => {
        const orgData = snap.data() || {};
        setSubscription(orgData.subscription || { plan: 'free', aiUsed: 0, aiQuota: 50 });
        setLoadingLimits(false);
      },
      (err) => {
        console.error('[usePlanLimits] Org listener error:', err);
        setLoadingLimits(false);
      }
    );

    // 2. One-time fetch for project and user counts (these don't need to be live)
    Promise.all([
      getDocs(query(collection(db, 'projects'), where('organizationId', '==', orgId))),
      getDocs(query(
        collection(db, 'users'),
        where('organizationId', '==', orgId),
        where('isActive', '!=', false),
      )),
    ]).then(([projectsSnap, usersSnap]) => {
      setProjectCount(projectsSnap.size);
      setUserCount(usersSnap.size);
    }).catch((err) => {
      console.error('[usePlanLimits] Failed to fetch counts:', err);
    });

    return () => unsubOrg();
  }, [orgId]);

  // ── Derived Values ──────────────────────────────────────────────────────────

  const planId = subscription?.plan || userProfile?.planId || 'free';
  const planLimits = getPlanLimits(planId);

  const maxProjects = subscription?.maxProjects ?? planLimits.maxProjects;
  const maxUsers    = subscription?.maxUsers    ?? planLimits.maxUsers;
  const aiQuota     = subscription?.aiQuota     ?? planLimits.aiQuota;
  const aiUsed      = subscription?.aiUsed      ?? 0;

  const isUnlimitedProjects = maxProjects === -1;
  const isUnlimitedUsers    = maxUsers    === -1;
  const isUnlimitedAI       = aiQuota     === -1;

  // ── Enforcement Helpers ────────────────────────────────────────────────────

  /**
   * Returns true if a new project can be created.
   * Pass `currentCount` from the component's reactive state for an accurate live check.
   * Shows a toast if the limit is reached.
   */
  const canAddProject = useCallback((currentCount) => {
    const count = currentCount !== undefined ? currentCount : projectCount;
    if (isUnlimitedProjects) return true;
    if (count < maxProjects) return true;

    toast.error(
      `Your ${planLimits.name} plan allows up to ${maxProjects} project${maxProjects !== 1 ? 's' : ''}. ` +
      `You've reached the limit. Upgrade to create more.`,
      { duration: 5000, id: 'plan-project-limit' }
    );
    return false;
  }, [isUnlimitedProjects, projectCount, maxProjects, planLimits.name]);

  /**
   * Returns true if a new user can be invited.
   * Pass `currentCount` from the component's reactive state for an accurate live check.
   * Shows a toast if the limit is reached.
   */
  const canAddUser = useCallback((currentCount) => {
    const count = currentCount !== undefined ? currentCount : userCount;
    if (isUnlimitedUsers) return true;
    if (count < maxUsers) return true;

    toast.error(
      `Your ${planLimits.name} plan allows up to ${maxUsers} user${maxUsers !== 1 ? 's' : ''} per project. ` +
      `You've reached the limit. Upgrade to assign more team members.`,
      { duration: 5000, id: 'plan-user-limit' }
    );
    return false;
  }, [isUnlimitedUsers, userCount, maxUsers, planLimits.name]);

  /**
   * Returns true if the AI generator can be used.
   * Shows a toast if the monthly quota is exhausted.
   */
  const canUseAI = useCallback(() => {
    if (isUnlimitedAI) return true;
    if (aiUsed < aiQuota) return true;

    toast.error(
      `You've used all ${aiQuota} AI bug generations for this month on the ${planLimits.name} plan. ` +
      `Upgrade or wait for your quota to reset next month.`,
      { duration: 6000, id: 'plan-ai-limit' }
    );
    return false;
  }, [isUnlimitedAI, aiUsed, aiQuota, planLimits.name]);

  /**
   * Optimistically bumps the local aiUsed counter after a successful generation.
   * The backend Cloud Function already updated Firestore — the onSnapshot listener
   * will pick up the real value automatically. This just gives instant UI feedback.
   */
  const incrementAIUsage = useCallback(() => {
    setSubscription(prev => prev ? { ...prev, aiUsed: (prev.aiUsed || 0) + 1 } : prev);
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    loadingLimits,
    planId,
    planName: planLimits.name,
    subscription,

    // Live counts
    projectCount,
    userCount,
    aiUsed,
    aiQuota,
    maxProjects,
    maxUsers,

    // Boolean shortcuts
    isUnlimitedProjects,
    isUnlimitedUsers,
    isUnlimitedAI,

    // Enforcement
    canAddProject,
    canAddUser,
    canUseAI,
    incrementAIUsage,

    // Progress values (0–100)
    projectUsagePct: isUnlimitedProjects ? 0 : Math.min(100, Math.round((projectCount / maxProjects) * 100)),
    userUsagePct:    isUnlimitedUsers    ? 0 : Math.min(100, Math.round((userCount    / maxUsers)    * 100)),
    aiUsagePct:      isUnlimitedAI       ? 0 : Math.min(100, Math.round((aiUsed       / aiQuota)     * 100)),
  };
}
