"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { AnimatedGridBackground } from "@/components/magic/animated-grid-background";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractGenerated } from "@/lib/llm/extractGenerated";
import {
  appendProjectMessage,
  createProject,
  updateProject,
} from "@/lib/firebase/projects";
import { useAuth } from "@/lib/firebase/useAuth";

type Step = "ask" | "building" | "done";

export default function StartClient() {
  const router = useRouter();
  const { user, status } = useAuth();
  const [prompt, setPrompt] = React.useState("");
  const [step, setStep] = React.useState<Step>("ask");
  const [statusText, setStatusText] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (status === "unauthed") router.replace("/auth?next=/start");
  }, [status, router]);

  async function start() {
    const p = prompt.trim();
    if (!p) return;
    if (!user) return;
    setStep("building");
    setStatusText("Starting generation…");
    setProgress(0.02);

    const steps = [
      "Designing a premium layout…",
      "Building a responsive hero + bento grid…",
      "Polishing typography + spacing…",
      "Adding glass + glow accents…",
      "Wiring the contact form…",
      "Finalizing mobile + desktop polish…",
    ];
    let stepIdx = 0;
    const ticker = window.setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setStatusText(steps[stepIdx] ?? null);
      setProgress((v) => Math.min(0.92, v + 0.03));
    }, 1200);

    const projectId = await createProject(user.uid, {
      title: p.slice(0, 60),
      lastPrompt: p,
    });

    await appendProjectMessage(user.uid, projectId, { role: "user", content: p }).catch(() => {});

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: p, history: [{ role: "user", content: p }] }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      setStatusText(text || "Failed to generate.");
      setStep("ask");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      setStatusText("No response body.");
      setStep("ask");
      return;
    }

    const decoder = new TextDecoder();
    let assistantText = "";
    let lastSave = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value, { stream: true });

      const now = Date.now();
      if (now - lastSave > 600) {
        lastSave = now;
        const partial = extractGenerated(assistantText);
        if (partial.previewTsx || partial.productionTsx) {
          await updateProject(user.uid, projectId, {
            previewTsx: partial.previewTsx ?? null,
            productionTsx: partial.productionTsx ?? null,
          }).catch(() => {});
        }
      }
    }

    const extracted = extractGenerated(assistantText);
    await appendProjectMessage(user.uid, projectId, {
      role: "assistant",
      content: assistantText,
    }).catch(() => {});
    await updateProject(user.uid, projectId, {
      previewTsx: extracted.previewTsx ?? null,
      productionTsx: extracted.productionTsx ?? null,
    }).catch(() => {});

    setStep("done");
    window.clearInterval(ticker);
    setProgress(1);
    setStatusText("Done. Opening your live preview…");
    await new Promise((r) => setTimeout(r, 450));

    router.push(`/studio?projectId=${encodeURIComponent(projectId)}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridBackground />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_0%,hsl(var(--foreground)/0.10),transparent_55%),radial-gradient(700px_circle_at_80%_10%,hsl(var(--foreground)/0.08),transparent_60%)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.21, 0.9, 0.2, 1] }}
          className="w-full"
        >
          <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card/50 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/brand/logo-mark.svg"
                  alt="Landing Studio"
                  width={40}
                  height={40}
                  priority
                />
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-tight">
                    Landing Studio
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email
                      ? `Signed in as ${user.email}`
                      : "Preparing your studio"}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/my-studio")}
                disabled={status !== "authed"}
              >
                My studio
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="max-w-[92%] rounded-2xl bg-background px-4 py-3 text-sm leading-6 ring-1 ring-border"
              >
                What landing page do you want to create today?
              </motion.div>

              {step !== "ask" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.45 }}
                  className="max-w-[92%] rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground ring-1 ring-border"
                >
                  {statusText ??
                    (step === "building"
                      ? "Setting up visuals, structure, and components…"
                      : "Done. Opening your live preview…")}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-foreground/70"
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.round(progress * 100)}%` }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              ) : null}
            </div>

            <div className="mt-6">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Example: "A premium landing page for a performance ad agency with a bento feature grid, glass hero, and a contact form."'
                className="min-h-28 bg-background"
                disabled={step !== "ask" || status !== "authed"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start();
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Press <span className="font-medium">⌘/Ctrl + Enter</span> to
                  start
                </div>
                <Button
                  onClick={start}
                  disabled={status !== "authed" || step !== "ask" || !prompt.trim()}
                >
                  Start generating
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

