import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { getFirebaseDb } from "./client";

export type Project = {
  id: string;
  title?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  previewTsx?: string | null;
  productionTsx?: string | null;
  lastPrompt?: string | null;
  deploymentUrl?: string | null;
};

export type ProjectMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function createProject(uid: string, data?: Partial<Project>) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const ref = await addDoc(collection(db, "users", uid, "projects"), {
    title: data?.title ?? null,
    previewTsx: data?.previewTsx ?? null,
    productionTsx: data?.productionTsx ?? null,
    lastPrompt: data?.lastPrompt ?? null,
    deploymentUrl: data?.deploymentUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateProject(
  uid: string,
  projectId: string,
  data: Partial<Project>,
) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  await setDoc(
    doc(db, "users", uid, "projects", projectId),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function getProject(uid: string, projectId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const snap = await getDoc(doc(db, "users", uid, "projects", projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) } as Project;
}

export async function listProjects(uid: string, take = 10) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const q = query(
    collection(db, "users", uid, "projects"),
    orderBy("updatedAt", "desc"),
    limit(take),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }) as Project,
  );
}

export async function appendProjectMessage(
  uid: string,
  projectId: string,
  msg: ProjectMessage,
) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  await addDoc(
    collection(db, "users", uid, "projects", projectId, "messages"),
    { ...msg, createdAt: serverTimestamp() },
  );
  await setDoc(
    doc(db, "users", uid, "projects", projectId),
    { updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function listProjectMessages(
  uid: string,
  projectId: string,
  take = 50,
) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");

  const q = query(
    collection(db, "users", uid, "projects", projectId, "messages"),
    orderBy("createdAt", "asc"),
    limit(take),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => d.data() as ProjectMessage);
}

