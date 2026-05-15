// Run this script using `node migrate_multi_tenant.js` to migrate your database.
// WARNING: Do this carefully and test locally before running against production!
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Need to export GOOGLE_APPLICATION_CREDENTIALS pointing to service account json
// Example: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-file.json"

initializeApp({
  credential: applicationDefault(),
  // projectId: "your-project-id"
});

const db = getFirestore();
const DEFAULT_ORG_ID = "default_org_id";

async function migrate() {
  console.log("Starting Multi-Tenant Migration Phase 1...");

  // 1. Create Default Organization
  const orgRef = db.collection('organizations').doc(DEFAULT_ORG_ID);
  await orgRef.set({
    name: "Default Organization",
    domain: "default.com",
    subscription: {
      planId: "free",
      status: "active"
    },
    aiUsage: {
      monthlyLimit: 100,
      currentUsage: 0,
    },
    createdAt: new Date().toISOString()
  });
  console.log("Created default organization.");

  // 2. Migrate Users
  const usersRef = db.collection('users');
  const usersSnap = await usersRef.get();
  const batch = db.batch();
  let count = 0;

  usersSnap.forEach(doc => {
    if (!doc.data().organizationId) {
      batch.update(doc.ref, { organizationId: DEFAULT_ORG_ID });
      count++;
    }
  });

  // 3. Migrate Projects
  const projectsRef = db.collection('projects');
  const projectsSnap = await projectsRef.get();
  projectsSnap.forEach(doc => {
    if (!doc.data().organizationId) {
      batch.update(doc.ref, { organizationId: DEFAULT_ORG_ID });
      count++;
    }
  });

  // 4. Migrate Bugs
  const bugsRef = db.collection('bugs');
  const bugsSnap = await bugsRef.get();
  bugsSnap.forEach(doc => {
    if (!doc.data().organizationId) {
      batch.update(doc.ref, { organizationId: DEFAULT_ORG_ID });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${count} documents to use organizationId: ${DEFAULT_ORG_ID}`);
  } else {
    console.log("No documents needed migration.");
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
