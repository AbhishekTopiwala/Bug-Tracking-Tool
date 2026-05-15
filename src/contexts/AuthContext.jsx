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
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { setGlobalOrgId } from '../services/firestoreService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

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
    let user;
    try {
      const result = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
      user = result.user;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        // If account exists, try to sign in to continue the process
        console.log("[AuthContext] Account already exists, attempting sign-in to complete profile...");
        const result = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
        user = result.user;
      } else {
        throw err;
      }
    }

    await updateProfile(user, { displayName });
    
    // Check for existing invited user with same email and merge data
    let invitedData = {};
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      
      for (const d of snap.docs) {
        if (d.id !== user.uid) {
          invitedData = d.data();
          try {
            await deleteDoc(d.ref);
            console.log(`[AuthContext] Cleaned up invited placeholder: ${d.id}`);
          } catch (deleteError) {
            console.warn(`[AuthContext] Could not delete placeholder ${d.id}:`, deleteError);
          }
        }
      }
    } catch (e) {
      console.error("Error cleaning up invited user docs:", e);
    }

    let orgId = "default_org_id";
    let finalRole = role;

    if (Object.keys(invitedData).length > 0) {
      orgId = invitedData.organizationId || "default_org_id";
      finalRole = invitedData.role || role;
    } else {
      // Cold Signup - Create Organization
      finalRole = 'org_admin'; // First user is the org admin
      const orgRef = doc(collection(db, 'organizations'));
      orgId = orgRef.id;
      await setDoc(orgRef, {
        name: workspaceName || 'My Workspace',
        domain: email.split('@')[1] || '',
        subscription: {
          planId: 'free',
          status: 'active'
        },
        aiUsage: {
          monthlyLimit: 100,
          currentUsage: 0,
        },
        createdAt: new Date().toISOString()
      });
    }

    const userData = {
      uid: user.uid,
      email: email.toLowerCase(),
      displayName: displayName || invitedData.name || '',
      role: finalRole,
      organizationId: orgId,
      isActive: true,
      invited: false,
      createdAt: invitedData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || invitedData.name || 'User')}&background=${avatarBg}&color=fff`,
      invitedBy: invitedData.invitedBy || null,
      invitedByEmail: invitedData.invitedByEmail || null,
    };
    await setDoc(doc(db, 'users', user.uid), userData);
    setUserProfile(userData);
    return user;
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
      setUserProfile(data);
      return data;
    }
    return null;
  }

  useEffect(() => {
    let unsubscribeProfile = null;

    console.log("AuthContext: Initializing...");

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: Auth state changed", user ? user.uid : "no user");
      try {
        setCurrentUser(user);

        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (user) {
          // Fetch profile initially to have it in context and check if deactivated
          console.log("AuthContext: Fetching user profile...");
          const profile = await fetchUserProfile(user.uid);
          console.log("AuthContext: Profile fetched", profile);
          if (profile) {
            setGlobalOrgId(profile.organizationId || 'default_org_id');
            if (profile.isActive === false) {
              await logout();
              toast.error('Your account has been deactivated.');
              setLoading(false);
              return;
            }
          }

          // Setup real-time listener to automatically log out the user if an Admin deactivates them
          const docRef = doc(db, 'users', user.uid);
          unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserProfile(data);
              setGlobalOrgId(data.organizationId || 'default_org_id');
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
        console.log("AuthContext: Loading set to false");
      }
    });

    // Fetch branding settings real-time
    console.log("AuthContext: Setting up branding listener...");

    // Preload instantly from localStorage fallback so it loads without any latency
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
    } catch (e) {
      console.warn("AuthContext: Initial local cache read warning:", e);
    }

    const brandingUnsub = onSnapshot(doc(db, 'settings', 'branding'), (snap) => {
      console.log("AuthContext: Branding settings updated");
      if (snap.exists()) {
        const data = snap.data();
        setBranding(data);
        try {
          localStorage.setItem('qualia_branding', JSON.stringify(data));
        } catch (e) {}
        // Apply primary color to CSS variables
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--accent', data.primaryColor);
          document.documentElement.style.setProperty('--dev-accent', data.primaryColor);
        }
      }
    }, (err) => {
      console.warn("AuthContext: Live branding listener rejected (this is expected if cloud Firestore rules are not yet deployed):", err);
    });

    // Safety timeout: if auth takes more than 5 seconds, force loading to false
    // to prevent a permanent blank page if Firebase hangs.
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("AuthContext: Initialization timed out. Forcing loading to false.");
        setLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      unsubscribeAuth();
      brandingUnsub();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    fetchUserProfile,
    branding,
    loading,
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
