"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";

import { AnimatedGridBackground } from "@/components/magic/animated-grid-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getFirebaseAuth,
  getMissingFirebaseEnvKeys,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.646 32.657 29.243 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.09 18.93C13.655 15.05 18.119 12 24 12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.222 0-9.613-3.317-11.293-7.946l-5.74 4.424C10.286 39.556 16.591 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.804 2.302-2.395 4.255-4.473 5.565l.003-.002 6.19 5.238C36.588 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function AuthClient({
  nextPath,
  initialMode,
}: {
  nextPath: string;
  initialMode: Mode;
}) {
  const router = useRouter();

  const [mode, setMode] = React.useState<Mode>(initialMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const firebaseOk = isFirebaseConfigured();
  const missingKeys = React.useMemo(() => getMissingFirebaseEnvKeys(), []);

  async function withLoading(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
      router.replace(nextPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);

    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase not configured");
      setLoading(false);
      return;
    }

    // If the user closes the popup, the rejection can arrive with a delay.
    // We want the button to be clickable immediately after the popup closes,
    // and we don't want to show an error for user-initiated cancellation.
    let finished = false;
    let focusReturned = false;

    const onFocus = () => {
      focusReturned = true;
      if (!finished) setLoading(false);
    };

    window.addEventListener("focus", onFocus, { once: true });

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      finished = true;
      setLoading(false);
      router.replace(nextPath);
    } catch (e: unknown) {
      finished = true;
      setLoading(false);

      const code =
        typeof (e as { code?: unknown } | null)?.code === "string"
          ? ((e as { code: string }).code as string)
          : "";
      const isUserClosed =
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request";

      if (isUserClosed || focusReturned) {
        // Silent: user cancelled, allow retry immediately.
        return;
      }

      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    }
  }

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (mode === "login" || password === password2);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridBackground />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_0%,hsl(var(--foreground)/0.10),transparent_55%),radial-gradient(700px_circle_at_80%_10%,hsl(var(--foreground)/0.08),transparent_60%)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.21, 0.9, 0.2, 1] }}
              className="flex items-center gap-3"
            >
              <Image
                src="/brand/logo-mark.svg"
                alt="Landing Studio"
                width={40}
                height={40}
                priority
              />
              <div>
                <div className="text-sm font-semibold tracking-tight">
                  Landing Studio
                </div>
                <div className="text-xs text-muted-foreground">
                  Sign in to generate client-ready landing pages
                </div>
              </div>
            </motion.div>

            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              {mode === "login" ? "Welcome back." : "Create your account."}
            </h1>
            <p className="mt-4 max-w-md text-pretty text-sm leading-6 text-muted-foreground">
              Access is required to generate pages, publish, and keep projects
              organized per client.
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="rounded-3xl border border-border bg-card/50 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">
                  {mode === "login" ? "Sign in" : "Sign up"}
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setError(null);
                    setMode((m) => (m === "login" ? "register" : "login"));
                  }}
                >
                  {mode === "login"
                    ? "Create an account"
                    : "Already have an account?"}
                </button>
              </div>

              {!firebaseOk ? (
                <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Firebase is not configured. Set your{" "}
                  <span className="font-medium">NEXT_PUBLIC_FIREBASE_*</span>{" "}
                  env vars to enable authentication.
                  {missingKeys.length ? (
                    <div className="mt-2 text-xs text-destructive/90">
                      Missing:
                      <span className="ml-2 font-mono">
                        {missingKeys.join(", ")}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="h-11 pl-10"
                    type="email"
                    autoComplete="email"
                  />
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-11 pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {mode === "register" ? (
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      placeholder="Confirm password"
                      className="h-11 pl-10"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                    />
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <Button
                  disabled={!firebaseOk || loading || !canSubmit}
                  onClick={() =>
                    withLoading(async () => {
                      const auth = getFirebaseAuth();
                      if (!auth) throw new Error("Firebase not configured");

                      if (mode === "login") {
                        await signInWithEmailAndPassword(
                          auth,
                          email.trim(),
                          password,
                        );
                      } else {
                        await createUserWithEmailAndPassword(
                          auth,
                          email.trim(),
                          password,
                        );
                      }
                    })
                  }
                  className="h-11"
                >
                  {mode === "login" ? "Continue" : "Create account"}
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="h-px w-full bg-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-xs text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className={cn("h-11")}
                  disabled={!firebaseOk || loading}
                  onClick={signInWithGoogle}
                >
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>

                <div className="pt-1 text-center text-xs text-muted-foreground">
                  By continuing you agree to your own terms and privacy policy.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

