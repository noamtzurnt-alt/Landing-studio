"use client";

import * as React from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import { getFirebaseAuth, isFirebaseConfigured } from "./client";

export function useAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [status, setStatus] = React.useState<
    "disabled" | "loading" | "authed" | "unauthed" | "error"
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
      (u) => {
        setUser(u);
        setStatus(u ? "authed" : "unauthed");
      },
      () => setStatus("error"),
    );

    return () => unsub();
  }, []);

  return { user, status };
}

