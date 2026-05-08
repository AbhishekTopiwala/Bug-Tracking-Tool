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
  writeBatch,
  limit,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { uploadToCloudinary } from './cloudinaryService';

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
    bugNumber: nextNumber,
    bugKey: bugKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    comments: [],
    attachments: [],
    tags: bugData.tags || [],
  });
  return docRef.id;
}

export async function updateBug(id, data) {
  const ref = doc(db, 'bugs', id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteBug(id) {
  await deleteDoc(doc(db, 'bugs', id));
}

export async function getBug(id) {
  const snap = await getDoc(doc(db, 'bugs', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeToBugs(callback) {
  const q = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const bugs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(bugs);
  }, (error) => {
    console.error("Error subscribing to bugs:", error);
    callback([]);
  });
}

export async function getAllBugs() {
  const q = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'));
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
    updatedAt: serverTimestamp(),
  });
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export async function getUsers(role) {
  let q;
  if (role) {
    q = query(collection(db, 'users'), where('role', '==', role));
  } else {
    q = query(collection(db, 'users'));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export async function createNotification(data) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
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
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getProjects(userId, role) {
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const allProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (role && role !== 'Admin' && userId) {
    // Only return projects where the user is in the assignedUsers array
    return allProjects.filter(p => p.assignedUsers?.includes(userId));
  }
  
  return allProjects;
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
