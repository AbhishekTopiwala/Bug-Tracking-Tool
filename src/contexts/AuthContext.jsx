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
    const userData = {
      uid: user.uid,
      email,
      displayName,
      role,
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
      setUserProfile(docSnap.data());
      return docSnap.data();
    }
    return null;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
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
