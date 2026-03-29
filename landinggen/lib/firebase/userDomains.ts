import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "./client";

export type PurchasedDomain = {
  domain: string;
  orderId?: string | null;
  expectedPrice?: number | null;
  vercelProject?: string | null;
  addedToProject?: boolean | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function saveUserDomain(
  uid: string,
  domain: string,
  data: Omit<PurchasedDomain, "domain">,
) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const normalized = domain.trim().toLowerCase();
  await setDoc(
    doc(db, "users", uid, "domains", normalized),
    {
      domain: normalized,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

