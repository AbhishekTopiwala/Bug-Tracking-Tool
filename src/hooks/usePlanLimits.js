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
  doc, getDoc, getDocs, collection, query, where, updateDoc, increment
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

  // Fetch org subscription + live counts on mount / orgId change
  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    async function fetchLimits() {
      setLoadingLimits(true);
      try {
        const [orgSnap, projectsSnap, usersSnap] = await Promise.all([
          getDoc(doc(db, 'organizations', orgId)),
          getDocs(query(collection(db, 'projects'), where('organizationId', '==', orgId))),
          getDocs(query(
            collection(db, 'users'),
            where('organizationId', '==', orgId),
            where('isActive', '!=', false),
          )),
        ]);

        if (!cancelled) {
          const orgData = orgSnap.data() || {};
          setSubscription(orgData.subscription || { plan: 'free', aiUsed: 0, aiQuota: 50 });
          setProjectCount(projectsSnap.size);
          setUserCount(usersSnap.size);
        }
      } catch (err) {
        console.error('[usePlanLimits] Failed to fetch limits:', err);
      } finally {
        if (!cancelled) setLoadingLimits(false);
      }
    }

    fetchLimits();
    return () => { cancelled = true; };
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
   * Atomically increments the org's aiUsed counter after a successful generation.
   * Call this AFTER a successful AI generation, not before.
   */
  const incrementAIUsage = useCallback(async () => {
    if (!orgId) return;
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        'subscription.aiUsed': increment(1),
      });
      setSubscription(prev => prev ? { ...prev, aiUsed: (prev.aiUsed || 0) + 1 } : prev);
    } catch (err) {
      console.error('[usePlanLimits] Failed to increment AI usage:', err);
    }
  }, [orgId]);

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
