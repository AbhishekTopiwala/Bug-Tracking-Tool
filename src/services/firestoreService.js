import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  limit,
  setDoc,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { uploadToCloudinary } from './cloudinaryService';

let currentOrgId = 'default_org_id';
let currentUserRole = 'QA';

export function setGlobalUserContext(orgId, role) {
  currentOrgId = orgId;
  currentUserRole = role;
}

export function setGlobalOrgId(orgId) {
  currentOrgId = orgId;
}

export function getCurrentOrgId() {
  return currentOrgId;
}

export function isSuperAdminContext() {
  return currentUserRole === 'super_admin' || currentUserRole === 'Superadmin';
}

// ── BUGS ──────────────────────────────────────────────────────────────────────

export async function createBug(bugData) {
  // Generate project prefix (e.g., "Easyvesy" -> "EV", "Mobile App" -> "MA")
  let prefix = 'BUG';
  if (bugData.projectName) {
    const name = bugData.projectName.trim();
    const parts = name.split(/(?=[A-Z])|\s+/).filter(Boolean);
    if (parts.length >= 2) {
      prefix = (parts[0][0] + parts[1][0]).toUpperCase();
    } else {
      prefix = name.slice(0, 2).toUpperCase();
    }
  }

  // Get the next sequence number for this project
  let nextNumber = 1;
  if (bugData.projectId) {
    const q = query(
      collection(db, 'bugs'),
      where('organizationId', '==', currentOrgId),
      where('projectId', '==', bugData.projectId),
      orderBy('bugNumber', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      nextNumber = (snap.docs[0].data().bugNumber || 0) + 1;
    }
  }

  const bugNumberStr = nextNumber < 10 ? `0${nextNumber}` : nextNumber;
  const bugKey = `${prefix}-${bugNumberStr}`;

  const docRef = await addDoc(collection(db, 'bugs'), {
    ...bugData,
    organizationId: currentOrgId,
    bugNumber: nextNumber,
    bugKey: bugKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    comments: [],
    attachments: [],
    tags: bugData.tags || [],
    history: [{
      type: 'event',
      user: bugData.reportedByName || 'QA',
      timestamp: new Date().toISOString(),
      details: 'Bug reported'
    }]
  });
  return docRef.id;
}

export async function updateBug(id, data, userName = 'Someone') {
  const ref = doc(db, 'bugs', id);
  const updateData = { ...data, updatedAt: serverTimestamp() };
  
  if (data.status) {
    updateData.history = arrayUnion({
      type: 'status',
      user: userName,
      timestamp: new Date().toISOString(),
      details: `Status changed to ${data.status}`
    });
  } else {
    updateData.history = arrayUnion({
      type: 'event',
      user: userName,
      timestamp: new Date().toISOString(),
      details: 'Bug updated'
    });
  }

  await updateDoc(ref, updateData);
}

export async function deleteBug(id) {
  await deleteDoc(doc(db, 'bugs', id));
}

export async function getBug(id) {
  const snap = await getDoc(doc(db, 'bugs', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

let activeBugsListener = null;
let activeBugsSubscribers = [];
let cachedBugs = null;

export function subscribeToBugs(callback) {
  // Return cached data immediately if available for smooth transitions
  if (cachedBugs !== null) {
    callback(cachedBugs);
  }

  activeBugsSubscribers.push(callback);

  if (!activeBugsListener) {
    const bugsRef = collection(db, 'bugs');
    let q;
    
    if (isSuperAdminContext()) {
      q = query(bugsRef, orderBy('createdAt', 'desc'));
    } else {
      q = query(bugsRef, where('organizationId', '==', currentOrgId), orderBy('createdAt', 'desc'));
    }
    
    activeBugsListener = onSnapshot(q, (snap) => {
      cachedBugs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      activeBugsSubscribers.forEach(cb => cb(cachedBugs));
    }, (error) => {
      console.error("Error subscribing to bugs:", error);
      activeBugsSubscribers.forEach(cb => cb([]));
    });
  }

  // Cleanup function for this specific subscriber
  return () => {
    activeBugsSubscribers = activeBugsSubscribers.filter(cb => cb !== callback);
    // If no more subscribers, kill the Firestore stream to save memory/reads
    if (activeBugsSubscribers.length === 0 && activeBugsListener) {
      activeBugsListener();
      activeBugsListener = null;
      cachedBugs = null;
    }
  };
}

export async function getAllBugs() {
  const q = query(collection(db, 'bugs'), where('organizationId', '==', currentOrgId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── COMMENTS ─────────────────────────────────────────────────────────────────

export async function addComment(bugId, comment) {
  const bugRef = doc(db, 'bugs', bugId);
  await updateDoc(bugRef, {
    comments: arrayUnion({
      ...comment,
      id: `comment_${Date.now()}`,
      createdAt: new Date().toISOString(),
    }),
    history: arrayUnion({
      type: 'comment',
      user: comment.authorName || 'User',
      timestamp: new Date().toISOString(),
      details: 'Added a comment'
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function updateComment(bugId, commentId, newText) {
  const bugRef = doc(db, 'bugs', bugId);
  const snap = await getDoc(bugRef);
  if (!snap.exists()) return;
  const bugData = snap.data();
  const comments = bugData.comments || [];
  const updatedComments = comments.map(c => {
    if (c.id === commentId) {
      return { ...c, text: newText, updatedAt: new Date().toISOString() };
    }
    return c;
  });
  await updateDoc(bugRef, {
    comments: updatedComments,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteComment(bugId, commentId) {
  const bugRef = doc(db, 'bugs', bugId);
  const snap = await getDoc(bugRef);
  if (!snap.exists()) return;
  const bugData = snap.data();
  const comments = bugData.comments || [];
  const updatedComments = comments.filter(c => c.id !== commentId);
  await updateDoc(bugRef, {
    comments: updatedComments,
    updatedAt: serverTimestamp(),
  });
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export async function getUsers(role) {
  let q;
  if (role) {
    q = query(collection(db, 'users'), where('organizationId', '==', currentOrgId), where('role', '==', role));
  } else {
    q = query(collection(db, 'users'), where('organizationId', '==', currentOrgId));
  }
  const snap = await getDocs(q);
  // Filter out deactivated users (isActive === false)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(u => u.isActive !== false);
}

export async function getAllDevelopers() {
  return getUsers('Developer');
}

// ── STORAGE ───────────────────────────────────────────────────────────────────

export const uploadAttachment = async (bugId, file) => {
  try {
    return await uploadToCloudinary(file);
  } catch (error) {
    console.error("Cloudinary Upload Error via uploadAttachment:", error);
    throw error;
  }
};

export async function addAttachmentToBug(bugId, attachment) {
  const bugRef = doc(db, 'bugs', bugId);
  await updateDoc(bugRef, {
    attachments: arrayUnion(attachment),
    updatedAt: serverTimestamp(),
  });
}

export async function removeAttachmentFromBug(bugId, attachment) {
  const bugRef = doc(db, 'bugs', bugId);
  await updateDoc(bugRef, {
    attachments: arrayRemove(attachment),
    updatedAt: serverTimestamp(),
  });
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export async function createNotification(data) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    organizationId: currentOrgId,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToNotifications(userId, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifs.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(notifs);
  }, (error) => {
    console.error("Error subscribing to notifications:", error);
    callback([]);
  });
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

export async function clearAllNotifications(userId) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function deleteNotification(id) {
  await deleteDoc(doc(db, 'notifications', id));
}

// ── PROJECTS ──────────────────────────────────────────────────────────────────

export async function createProject(projectData) {
  const docRef = await addDoc(collection(db, 'projects'), {
    ...projectData,
    organizationId: currentOrgId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getProjects(userId, role) {
  const q = query(collection(db, 'projects'), where('organizationId', '==', currentOrgId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const allProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (role && role !== 'Admin' && userId) {
    // Only return projects where the user is in the assignedUsers array
    return allProjects.filter(p => p.assignedUsers?.includes(userId));
  }
  
  return allProjects;
}

export function subscribeToProjects(userId, role, callback) {
  const projectsRef = collection(db, 'projects');
  let q;
  
  if (role === 'super_admin' || role === 'Superadmin') {
    q = query(projectsRef, orderBy('createdAt', 'desc'));
  } else {
    q = query(projectsRef, where('organizationId', '==', currentOrgId), orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, (snap) => {
    let allProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (role && role !== 'Admin' && userId) {
      allProjects = allProjects.filter(p => p.assignedUsers?.includes(userId));
    }
    callback(allProjects);
  }, (error) => {
    console.error("Error subscribing to projects:", error);
    callback([]);
  });
}

export async function updateProject(id, data) {
  const docRef = doc(db, 'projects', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(id) {
  await deleteDoc(doc(db, 'projects', id));
}

// ── BRANDING & PUBLIC ────────────────────────────────────────────────────────
export async function getBrandingSettings() {
  let localData = null;
  try {
    const cached = localStorage.getItem('qualia_branding');
    if (cached) {
      localData = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("getBrandingSettings: Local cache read error:", e);
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'branding'));
    if (snap.exists()) {
      const dbData = snap.data();
      try {
        localStorage.setItem('qualia_branding', JSON.stringify(dbData));
      } catch (e) {}
      return dbData;
    }
  } catch (error) {
    console.warn("getBrandingSettings: Firestore read error. Utilizing localStorage or default fallback:", error);
  }

  return localData || {
    logoUrl: '',
    primaryColor: '#6366f1',
    portalName: 'Qualia',
  };
}

export async function updateBrandingSettings(data) {
  try {
    localStorage.setItem('qualia_branding', JSON.stringify(data));
  } catch (e) {
    console.warn("updateBrandingSettings: Local cache save error:", e);
  }

  try {
    await setDoc(doc(db, 'settings', 'branding'), data, { merge: true });
  } catch (error) {
    console.warn("updateBrandingSettings: Live Firestore update failed. Utilizing local storage offline fallback.", error);
    // Resolve successfully to allow frontend to save without throwing toast errors
  }
}

export async function getPublicProjectData(projectId) {
  const projectSnap = await getDoc(doc(db, 'projects', projectId));
  if (!projectSnap.exists()) throw new Error('Project not found');
  
  const bugsQuery = query(collection(db, 'bugs'), where('projectId', '==', projectId));
  const bugsSnap = await getDocs(bugsQuery);
  const bugs = bugsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  return {
    project: { id: projectSnap.id, ...projectSnap.data() },
    bugs: bugs.map(b => ({
      status: b.status,
      priority: b.priority,
      bugKey: b.bugKey,
      title: b.title, // Maybe hide this if public? No, user asked for "Project Status View"
      createdAt: b.createdAt
    }))
  };
}
