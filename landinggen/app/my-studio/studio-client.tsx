"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Sparkles } from "lucide-react";

import { AnimatedGridBackground } from "@/components/magic/animated-grid-background";
import { Button } from "@/components/ui/button";
import { listProjects, type Project } from "@/lib/firebase/projects";
import { useAuth } from "@/lib/firebase/useAuth";
import { cn } from "@/lib/utils";

function formatUpdatedAt(v: unknown) {
  if (!v) return "";
  const any = v as any;
  const d: Date | null =
    typeof any?.toDate === "function"
      ? any.toDate()
      : typeof any?.seconds === "number"
        ? new Date(any.seconds * 1000)
        : null;
  if (!d) return "";
  return d.toLocaleString();
}

export default function MyStudioClient() {
  const router = useRouter();
  const { user, status } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (status === "unauthed") router.replace("/auth?next=/my-studio");
  }, [status, router]);

  React.useEffect(() => {
    if (!user) return;
    setLoading(true);
    listProjects(user.uid, 50)
      .then((p) => setProjects(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridBackground />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_0%,hsl(var(--foreground)/0.10),transparent_55%),radial-gradient(700px_circle_at_80%_10%,hsl(var(--foreground)/0.08),transparent_60%)]" />

      <div className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-mark.svg"
              alt="Landing Studio"
              width={34}
              height={34}
              priority
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">
                My Studio
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.email ? user.email : "Loading…"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/start")}
              disabled={status !== "authed"}
            >
              <Plus className="mr-2" />
              New site
            </Button>
            <Button variant="ghost" onClick={() => router.push("/studio")}>
              Open studio
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              Your landing pages
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Create, open, and publish projects you generated.
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => router.push("/start")}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-5 text-left shadow-sm backdrop-blur transition",
              "hover:bg-card/55 hover:shadow-md",
            )}
            disabled={status !== "authed"}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                Create new
              </div>
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Start from a prompt and generate a premium landing page.
            </div>
          </button>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">
              Loading projects…
            </div>
          ) : null}

          {!loading && projects.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground sm:col-span-2 lg:col-span-2">
              No projects yet. Click “Create new” to generate your first landing
              page.
            </div>
          ) : null}

          {projects.map((p) => (
            <div
              key={p.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-5 shadow-sm backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold tracking-tight">
                    {(p.title || "Untitled").slice(0, 60)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatUpdatedAt(p.updatedAt) || "—"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/studio?projectId=${encodeURIComponent(p.id)}`)}
                >
                  Open
                </Button>
              </div>

              {p.deploymentUrl ? (
                <div className="mt-4">
                  <Link
                    href={p.deploymentUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Live link
                  </Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

