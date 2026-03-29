"use client";

import * as React from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

import { getFirebaseAuth, isFirebaseConfigured } from "./client";

export function useAnonymousAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [status, setStatus] = React.useState<
    "disabled" | "loading" | "ready" | "error"
  >("loading");

  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      setStatus("disabled");
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setStatus("disabled");
      return;
    }

    setStatus("loading");
    const unsub = onAuthStateChanged(
      auth,
      async (u) => {
        if (u) {
          setUser(u);
          setStatus("ready");
          return;
        }
        try {
          await signInAnonymously(auth);
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("error"),
    );

    return () => unsub();
  }, []);

  return { user, status };
}

