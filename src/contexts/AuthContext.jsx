import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName, role = 'QA', avatarBg = '6366f1') {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    
    // Check for existing invited user with same email and remove to avoid duplicates
    try {
      const { query, collection, where, getDocs, deleteDoc } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      const batch = [];
      snap.docs.forEach(d => {
        if (d.id !== user.uid) batch.push(deleteDoc(d.ref));
      });
      if (batch.length > 0) await Promise.all(batch);
    } catch (e) {
      console.error("Error cleaning up invited user docs:", e);
    }

    const userData = {
      uid: user.uid,
      email,
      displayName,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${avatarBg}&color=fff`,
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        // If user is deactivated, force logout
        if (profile && profile.isActive === false) {
          await logout();
          toast.error('Your account has been deactivated.');
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    fetchUserProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
