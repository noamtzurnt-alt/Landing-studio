import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "./client";

export async function ensureLeadClientAccess(uid: string, clientId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const normalized = clientId.trim().toLowerCase();
  if (!normalized) return;

  await setDoc(
    doc(db, "users", uid, "leadClients", normalized),
    {
      clientId: normalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

