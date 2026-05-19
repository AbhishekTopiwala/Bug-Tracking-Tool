import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  query,
  collection,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { setGlobalOrgId, setGlobalUserContext } from '../services/firestoreService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

let isSigningUp = false;

async function migrateProjectAndBugAssignments(oldId, newId, orgId) {
  if (!oldId || !newId || !orgId) return;
  console.log(`[AuthContext] Migrating assignments from placeholder ${oldId} to real UID ${newId} in org ${orgId}...`);
  try {
    // 1. Projects
    const qProjects = query(
      collection(db, 'projects'),
      where('organizationId', '==', orgId),
      where('assignedUsers', 'array-contains', oldId)
    );
    const snapProjects = await getDocs(qProjects);
    console.log(`[AuthContext] Found ${snapProjects.size} projects referencing placeholder ${oldId}`);
    for (const projectDoc of snapProjects.docs) {
      const data = projectDoc.data();
      const assignedUsers = data.assignedUsers || [];
      const updatedUsers = assignedUsers.map(uid => uid === oldId ? newId : uid);
      const uniqueUsers = Array.from(new Set(updatedUsers));
      await updateDoc(doc(db, 'projects', projectDoc.id), {
        assignedUsers: uniqueUsers
      });
      console.log(`[AuthContext] Updated project ${projectDoc.id} assignments.`);
    }

    // 2. Bugs
    const qBugs = query(
      collection(db, 'bugs'),
      where('organizationId', '==', orgId),
      where('assigneeId', '==', oldId)
    );
    const snapBugs = await getDocs(qBugs);
    console.log(`[AuthContext] Found ${snapBugs.size} bugs assigned to placeholder ${oldId}`);
    for (const bugDoc of snapBugs.docs) {
      await updateDoc(doc(db, 'bugs', bugDoc.id), {
        assigneeId: newId
      });
      console.log(`[AuthContext] Updated bug ${bugDoc.id} assigneeId.`);
    }
  } catch (err) {
    console.error("[AuthContext] Error migrating assignments:", err);
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [branding, setBranding] = useState({
    logoUrl: '',
    primaryColor: '#6366f1',
    portalName: 'Qualia',
  });
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName, role = 'QA', avatarBg = '6366f1', workspaceName = '') {
    isSigningUp = true;
    try {
      let user;
      
      // Phase 1: Authentication
      try {
        console.log("[AuthContext] Phase 1: Creating user in Firebase Auth...");
        const result = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
        user = result.user;
        console.log("[AuthContext] User created in Auth:", user.uid);
      } catch (err) {
        const errCode = err.code || err.error?.code;
        const errMsg = err.message || err.error?.message || "";
        
        const isEmailInUse = errCode === 'auth/email-already-in-use' || 
                            errCode === 'EMAIL_EXISTS' ||
                            errMsg.includes('EMAIL_EXISTS') ||
                            errMsg.includes('email-already-in-use');

        if (isEmailInUse) {
          console.log("[AuthContext] Account already exists. Attempting auto-login to self-heal profile/invites...");
          try {
            const loginResult = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
            user = loginResult.user;
            console.log("[AuthContext] Auto-login succeeded during signup collision for UID:", user.uid);
          } catch (loginErr) {
            console.warn("[AuthContext] Auto-login fallback failed:", loginErr);
            const finalErr = new Error("An account with this email already exists. Please log in instead.");
            finalErr.code = 'auth/email-already-in-use';
            throw finalErr;
          }
        } else {
          throw err;
        }
      }

      // Phase 2: User Initialization
      try {
        console.log("[AuthContext] Phase 2: Updating profile...");
        await updateProfile(user, { displayName });
        
        console.log("[AuthContext] Phase 3: Checking for invites...");
        let invitedData = {};
        try {
          const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
          const snap = await getDocs(q);
          
          for (const d of snap.docs) {
            const data = d.data();
            if (data.invited) {
              invitedData = data;
              if (d.id !== user.uid) {
                await migrateProjectAndBugAssignments(d.id, user.uid, invitedData.organizationId || "default_org_id");
                await deleteDoc(doc(db, 'users', d.id));
              }
              break;
            }
          }
        } catch (inviteErr) {
          console.warn("[AuthContext] Failed to check for invites (non-critical):", inviteErr);
        }

        console.log("[AuthContext] Phase 4: Initializing data...");
        let orgId = '';
        let finalRole = role;

        if (Object.keys(invitedData).length > 0) {
          orgId = invitedData.organizationId || "default_org_id";
          finalRole = invitedData.role || role;
        } else {
          const orgRef = doc(collection(db, 'organizations'));
          orgId = orgRef.id;
          console.log("[AuthContext] Calling setDoc for organization...");
          try {
            await setDoc(orgRef, {
              name: workspaceName || 'My Workspace',
              ownerId: user.uid,
              createdAt: serverTimestamp(),
              subscription: {
                plan: 'free',
                status: 'active',
                aiQuota: 100,
                aiUsed: 0,
                resetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
              }
            });
          } catch (orgErr) {
            console.error("[AuthContext] Error creating organization:", orgErr);
            throw orgErr;
          }
          finalRole = 'Admin'; // Creator is Admin
        }

        console.log("[AuthContext] Phase 5: Saving user profile...");
        const userData = {
          uid: user.uid,
          email: email.toLowerCase(),
          displayName,
          role: finalRole,
          organizationId: orgId,
          avatarBg,
          isActive: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userData);
        } catch (userErr) {
          console.error("[AuthContext] Error creating user document:", userErr);
          throw userErr;
        }
        
        try {
          setUserProfile(userData);
          setGlobalUserContext(orgId, finalRole);
        } catch (ctxErr) {
          console.error("[AuthContext] Error setting context:", ctxErr);
        }
        
        console.log("[AuthContext] Signup process complete for UID:", user.uid);
        return user;
      } catch (finalErr) {
        console.error("[AuthContext] Critical error during signup post-auth:", finalErr);
        throw finalErr;
      }
    } finally {
      isSigningUp = false;
    }
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function fetchUserProfile(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setGlobalUserContext(data.organizationId, data.role);
      setUserProfile(data);
      return data;
    }
    return null;
  }

  async function healUserProfile(user) {
    const email = user.email.toLowerCase();
    const displayName = user.displayName || email.split('@')[0] || 'User';
    console.log("[AuthContext] Healing profile for:", email);

    let invitedData = {};
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const data = d.data();
        if (data.invited) {
          invitedData = data;
          if (d.id !== user.uid) {
            await migrateProjectAndBugAssignments(d.id, user.uid, invitedData.organizationId || "default_org_id");
            await deleteDoc(doc(db, 'users', d.id));
          }
          break;
        }
      }
    } catch (inviteErr) {
      console.warn("[AuthContext] Failed to check for invites during healing:", inviteErr);
    }

    let orgId = '';
    let finalRole = 'QA';

    if (Object.keys(invitedData).length > 0) {
      orgId = invitedData.organizationId || "default_org_id";
      finalRole = invitedData.role || 'QA';
    } else {
      const orgRef = doc(collection(db, 'organizations'));
      orgId = orgRef.id;
      console.log("[AuthContext] Healing: Creating default organization...");
      try {
        await setDoc(orgRef, {
          name: 'My Workspace',
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          subscription: {
            plan: 'free',
            status: 'active',
            aiQuota: 100,
            aiUsed: 0,
            resetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
          }
        });
      } catch (orgErr) {
        console.error("[AuthContext] Healing: Error creating organization:", orgErr);
        throw orgErr;
      }
      finalRole = 'Admin';
    }

    const userData = {
      uid: user.uid,
      email: email,
      displayName,
      role: finalRole,
      organizationId: orgId,
      avatarBg: '6366f1',
      isActive: true,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    console.log("[AuthContext] Healing: Saving user profile...");
    await setDoc(doc(db, 'users', user.uid), userData);
    setUserProfile(userData);
    setGlobalUserContext(orgId, finalRole);
    return userData;
  }

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);

        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (user) {
          if (isSigningUp) {
            console.log("[AuthContext] Auth state changed during active signup. Bypassing self-healing and profile verification check.");
            const docRef = doc(db, 'users', user.uid);
            unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setGlobalUserContext(data.organizationId || 'default_org_id', data.role);
                setUserProfile(data);
                if (data.isActive === false) {
                  await logout();
                  toast.error('Your account has been deactivated.');
                }
              }
            }, (err) => {
              console.error("AuthContext: Profile listener error during signup", err);
            });
            setLoading(false);
            return;
          }

          let profile = await fetchUserProfile(user.uid);
          if (!profile) {
            console.log("[AuthContext] Firestore profile missing for authenticated user. Attempting self-healing...");
            try {
              profile = await healUserProfile(user);
            } catch (healErr) {
              console.error("[AuthContext] Self-healing failed:", healErr);
            }
          }

          if (profile) {
            setGlobalUserContext(profile.organizationId || 'default_org_id', profile.role);
            if (profile.isActive === false) {
              await logout();
              toast.error('Your account has been deactivated.');
              setLoading(false);
              return;
            }
          } else {
            await logout();
            toast.error('User account not found in database. Please contact your administrator.');
            setLoading(false);
            return;
          }

          const docRef = doc(db, 'users', user.uid);
          unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setGlobalUserContext(data.organizationId || 'default_org_id', data.role);
              setUserProfile(data);
              if (data.isActive === false) {
                await logout();
                toast.error('Your account has been deactivated.');
              }
            }
          }, (err) => {
            console.error("AuthContext: Profile listener error", err);
          });
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("AuthContext: Error in onAuthStateChanged", error);
      } finally {
        setLoading(false);
      }
    });

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    let brandingUnsub = null;

    try {
      const cached = localStorage.getItem('qualia_branding');
      if (cached) {
        const localData = JSON.parse(cached);
        setBranding(localData);
        if (localData.primaryColor) {
          document.documentElement.style.setProperty('--accent', localData.primaryColor);
          document.documentElement.style.setProperty('--dev-accent', localData.primaryColor);
        }
      }
    } catch (e) {}

    if (userProfile && !['super_admin', 'Superadmin'].includes(userProfile.role) && userProfile.organizationId) {
      brandingUnsub = onSnapshot(doc(db, 'organizations', userProfile.organizationId), (snap) => {
        if (snap.exists()) {
          const orgData = snap.data();
          if (orgData.branding) {
            setBranding(orgData.branding);
            if (orgData.branding.primaryColor) {
              document.documentElement.style.setProperty('--accent', orgData.branding.primaryColor);
              document.documentElement.style.setProperty('--dev-accent', orgData.branding.primaryColor);
            }
          }
        }
      });
    } else {
      brandingUnsub = onSnapshot(doc(db, 'settings', 'branding'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setBranding(data);
          try {
            localStorage.setItem('qualia_branding', JSON.stringify(data));
          } catch (e) {}
          if (data.primaryColor) {
            document.documentElement.style.setProperty('--accent', data.primaryColor);
            document.documentElement.style.setProperty('--dev-accent', data.primaryColor);
          }
        }
      });
    }

    return () => {
      if (brandingUnsub) brandingUnsub();
    };
  }, [userProfile?.organizationId, userProfile?.role]);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    fetchUserProfile,
    branding,
    loading,
    isSuperAdmin: userProfile?.role === 'super_admin' || userProfile?.role === 'Superadmin',
    isAdmin: ['org_admin', 'Admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#F5F7FB',
          color: '#64748B',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #E2E8F0',
            borderTopColor: '#5B6CFF',
            borderRadius: '50%',
            animation: 'auth-spin 0.8s linear infinite',
            marginBottom: 20
          }} />
          <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Initializing secure session...</p>
          <style>{`
            @keyframes auth-spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
