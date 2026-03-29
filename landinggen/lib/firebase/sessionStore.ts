import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { getFirebaseDb } from "./client";

export type PersistedMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function createSession(sessionId: string, uid: string) {
  const db = getFirebaseDb();
  if (!db) return;

  await setDoc(
    doc(db, "sessions", sessionId),
    {
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function appendMessage(sessionId: string, msg: PersistedMessage) {
  const db = getFirebaseDb();
  if (!db) return;

  await addDoc(collection(db, "sessions", sessionId, "messages"), {
    ...msg,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "sessions", sessionId),
    { updatedAt: serverTimestamp() },
    { merge: true },
  );
}

