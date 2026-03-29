"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Code2, Eye, Monitor, Rocket, Smartphone } from "lucide-react";

import type { ChatMessage } from "@/components/studio/chat-panel";
import { ChatPanel } from "@/components/studio/chat-panel";
import { PreviewPane } from "@/components/studio/preview-pane";
import { AnimatedGridBackground } from "@/components/magic/animated-grid-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ensureLeadClientAccess } from "@/lib/firebase/leadClients";
import {
  appendProjectMessage,
  createProject,
  getProject,
  listProjects,
  listProjectMessages,
  updateProject,
} from "@/lib/firebase/projects";
import { saveUserDomain } from "@/lib/firebase/userDomains";
import { useAuth } from "@/lib/firebase/useAuth";
import { extractGenerated } from "@/lib/llm/extractGenerated";
import { cn } from "@/lib/utils";

type Generated = {
  previewTsx: string;
  productionTsx: string;
};

type ViewMode = "preview" | "code";
type PreviewDevice = "desktop" | "mobile";

type DomainAvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; domain: string }
  | { status: "unavailable"; domain: string }
  | { status: "error"; message: string };

type DomainBuyState =
  | { status: "idle" }
  | { status: "buying" }
  | { status: "done"; domain: string; orderId?: string | null }
  | { status: "error"; message: string };

type RegistrantForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  companyName: string;
};

function mergeUniqueProjects(
  items: { id: string; title?: string | null; updatedAt?: unknown }[],
) {
  const seen = new Set<string>();
  const out: { id: string; title?: string | null; updatedAt?: unknown }[] = [];
  for (const p of items) {
    if (!p?.id) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export default function StudioClient({
  initialProjectId,
  initialPrompt,
}: {
  initialProjectId: string | null;
  initialPrompt: string | null;
}) {
  const router = useRouter();
  const qpProjectId = initialProjectId;
  const qpPrompt = initialPrompt;

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("preview");
  const [previewDevice, setPreviewDevice] = React.useState<PreviewDevice>("desktop");
  const [customDomain, setCustomDomain] = React.useState("");
  const [domainAvailability, setDomainAvailability] =
    React.useState<DomainAvailabilityState>({ status: "idle" });
  const [domainBuyOpen, setDomainBuyOpen] = React.useState(false);
  const [domainBuy, setDomainBuy] = React.useState<DomainBuyState>({
    status: "idle",
  });
  const [registrant, setRegistrant] = React.useState<RegistrantForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "IL",
    companyName: "",
  });
  const [leadsClientId, setLeadsClientId] = React.useState("");
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [projects, setProjects] = React.useState<
    { id: string; title?: string | null; updatedAt?: unknown }[]
  >([]);
  const [generated, setGenerated] = React.useState<Generated>({
    previewTsx: "",
    productionTsx: "",
  });
  const [projectLoading, setProjectLoading] = React.useState(false);

  const { user, status: authStatus } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    setRegistrant((r) => ({ ...r, email: r.email || user.email || "" }));
  }, [user]);

  React.useEffect(() => {
    if (authStatus === "unauthed") {
      router.replace("/auth?next=/studio");
    }
  }, [authStatus, router]);

  React.useEffect(() => {
    if (!user) return;
    listProjects(user.uid, 12)
      .then((p) => setProjects((prev) => mergeUniqueProjects([...p, ...prev])))
      .catch(() => {});
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      if (qpProjectId) {
        setProjectId(qpProjectId);
        return;
      }

      if (qpPrompt) {
        const id = await createProject(user.uid, {
          title: qpPrompt.slice(0, 60),
          lastPrompt: qpPrompt,
        });
        setProjectId(id);
        setProjects((p) =>
          mergeUniqueProjects([{ id, title: qpPrompt.slice(0, 60) }, ...p]),
        );
        router.replace(
          `/studio?projectId=${encodeURIComponent(id)}&prompt=${encodeURIComponent(qpPrompt)}&new=1`,
        );
      } else {
        const id = await createProject(user.uid, { title: "New landing" });
        setProjectId(id);
        setProjects((p) => mergeUniqueProjects([{ id, title: "New landing" }, ...p]));
        router.replace(`/studio?projectId=${encodeURIComponent(id)}`);
      }
    })().catch(() => {});
  }, [user, qpProjectId, qpPrompt, router]);

  React.useEffect(() => {
    if (!user || !projectId) return;
    setProjectLoading(true);
    (async () => {
      const p = await getProject(user.uid, projectId).catch(() => null);
      setGenerated({
        previewTsx: p?.previewTsx ?? "",
        productionTsx: p?.productionTsx ?? "",
      });
      const msgs = await listProjectMessages(user.uid, projectId).catch(
        () => [],
      );
      if (msgs.length) {
        setMessages(
          msgs.map((m) => ({
            id: crypto.randomUUID(),
            role: m.role,
            content: m.content,
          })),
        );
      } else {
        setMessages([]);
      }
      setProjectLoading(false);
    })().catch(() => {});
  }, [user, projectId]);

  const autoSentRef = React.useRef(false);
  React.useEffect(() => {
    if (!user || !projectId) return;
    if (!qpPrompt) return;
    if (autoSentRef.current) return;
    if (messages.length > 0) return;
    autoSentRef.current = true;
    send(qpPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId, qpPrompt]);

  const normalizedLeadsClientId = React.useMemo(
    () => leadsClientId.trim().toLowerCase(),
    [leadsClientId],
  );
  const isLeadsClientIdValid = React.useMemo(() => {
    if (!normalizedLeadsClientId) return true;
    return /^[a-z0-9-_]+$/.test(normalizedLeadsClientId);
  }, [normalizedLeadsClientId]);

  async function send(prompt: string) {
    if (!user || !projectId) return;
    const normalizedPrompt = (() => {
      const p = prompt.trim();
      // If the user asks for Hebrew, make it explicit to the model.
      if (/[\u0590-\u05FF]/.test(p) || /\b(hebrew|עברית)\b/i.test(p)) {
        return `${p}\n\nIMPORTANT: Translate ALL visible UI copy to Hebrew (RTL-friendly where relevant).`;
      }
      return p;
    })();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: normalizedPrompt,
    };

    setMessages((m) => [...m, userMsg]);
    setIsGenerating(true);
    appendProjectMessage(user.uid, projectId, {
      role: "user",
      content: normalizedPrompt,
    }).catch(() => {});
    updateProject(user.uid, projectId, { lastPrompt: normalizedPrompt }).catch(
      () => {},
    );

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: normalizedPrompt,
          current: generated,
          // Reduce token usage: current code is already provided via `current`.
          // Only send recent user instructions.
          history: [...messages, userMsg]
            .filter((m) => m.role === "user")
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantText = "";
      let lastApplyMs = 0;
      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId ? { ...msg, content: assistantText } : msg,
          ),
        );

        const now = Date.now();
        if (now - lastApplyMs > 200) {
          lastApplyMs = now;
          const partial = extractGenerated(assistantText);
          if (partial.previewTsx || partial.productionTsx) {
            setGenerated((g) => ({
              previewTsx: partial.previewTsx ?? g.previewTsx,
              productionTsx: partial.productionTsx ?? g.productionTsx,
            }));
          }
        }
      }

      const extracted = extractGenerated(assistantText);
      const gotAnyCode = Boolean(extracted.previewTsx || extracted.productionTsx);
      if (!gotAnyCode) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    "I couldn't apply that change because the model didn't return updated code. Please try rephrasing the request.",
                }
              : msg,
          ),
        );
        throw new Error("Model did not return code blocks.");
      }
      setGenerated((g) => ({
        previewTsx: extracted.previewTsx ?? g.previewTsx,
        productionTsx: extracted.productionTsx ?? g.productionTsx,
      }));

      appendProjectMessage(user.uid, projectId, {
        role: "assistant",
        content: assistantText,
      }).catch(() => {});

      updateProject(user.uid, projectId, {
        previewTsx: extracted.previewTsx ?? null,
        productionTsx: extracted.productionTsx ?? null,
      }).catch(() => {});
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: message },
      ]);
      appendProjectMessage(user.uid, projectId, {
        role: "assistant",
        content: message,
      }).catch(() => {});
    } finally {
      setIsGenerating(false);
    }
  }

  const normalizedCustomDomain = React.useMemo(
    () => customDomain.trim().toLowerCase(),
    [customDomain],
  );

  async function checkDomainAvailability() {
    const domain = normalizedCustomDomain;
    if (!domain) return;
    setDomainAvailability({ status: "checking" });
    try {
      const res = await fetch("/api/domains/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Availability check failed");
      setDomainAvailability(
        payload?.available
          ? { status: "available", domain: payload.domain || domain }
          : { status: "unavailable", domain: payload.domain || domain },
      );
    } catch (e) {
      setDomainAvailability({
        status: "error",
        message: e instanceof Error ? e.message : "Availability check failed",
      });
    }
  }

  async function buyDomain() {
    if (!user) return;
    const domain = normalizedCustomDomain;
    if (!domain) return;
    setDomainBuy({ status: "buying" });
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/domains/buy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domain,
          years: 1,
          autoRenew: true,
          contactInformation: {
            firstName: registrant.firstName.trim(),
            lastName: registrant.lastName.trim(),
            email: registrant.email.trim(),
            phone: registrant.phone.trim(),
            address1: registrant.address1.trim(),
            address2: registrant.address2.trim() || undefined,
            city: registrant.city.trim(),
            state: registrant.state.trim(),
            zip: registrant.zip.trim(),
            country: registrant.country.trim().toUpperCase(),
            companyName: registrant.companyName.trim() || undefined,
          },
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Domain purchase failed");

      await saveUserDomain(user.uid, payload.domain || domain, {
        orderId: payload.orderId ?? null,
        expectedPrice: payload.expectedPrice ?? null,
        vercelProject: payload.project ?? null,
        addedToProject: payload.addedToProject ?? null,
      }).catch(() => {});

      setDomainBuy({
        status: "done",
        domain: payload.domain || domain,
        orderId: payload.orderId ?? null,
      });
      setDomainAvailability({ status: "available", domain: payload.domain || domain });
    } catch (e) {
      setDomainBuy({
        status: "error",
        message: e instanceof Error ? e.message : "Domain purchase failed",
      });
    }
  }

  async function publish() {
    if (!isLeadsClientIdValid) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Client ID / Campaign is invalid. Use only lowercase letters, numbers, hyphen (-), underscore (_).",
        },
      ]);
      return;
    }
    if (!projectId || !user) return;

    if (normalizedLeadsClientId) {
      try {
        await ensureLeadClientAccess(user.uid, normalizedLeadsClientId);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Heads up: I couldn't register lead access for this Client ID. Publishing will still work, but lead viewing permissions may be missing.",
          },
        ]);
      }
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productionTsx: generated.productionTsx,
          previewTsx: generated.previewTsx,
          customDomain: customDomain.trim() || undefined,
          leadsClientId: normalizedLeadsClientId || undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || "Publish failed");

      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Published: ${payload?.url ?? "(missing url)"}${
            payload?.domainAssigned?.domain
              ? `\nDomain added: ${payload.domainAssigned.domain} (addedToProject=${payload.domainAssigned.addedToProject})`
              : ""
          }${
            payload?.leadsDestination?.clientId
              ? `\nLeads destination: leads/${payload.leadsDestination.clientId}/entries`
              : ""
          }`,
        },
      ]);
      updateProject(user.uid, projectId, {
        deploymentUrl: payload?.url ?? null,
      }).catch(() => {});
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: message },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <AnimatedGridBackground />
      <div className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-mark.svg"
              alt="Landing Studio"
              width={36}
              height={36}
              priority
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">
                Landing Studio
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <select
                value={projectId ?? ""}
                disabled
                className="h-9 w-[220px] cursor-not-allowed rounded-lg border border-input bg-background px-3 text-sm opacity-80"
              >
                {projectId ? (
                  <option value={projectId}>
                    {(
                      projects.find((p) => p.id === projectId)?.title ||
                      "Current project"
                    ).slice(0, 32)}
                  </option>
                ) : (
                  <option value="">Current project</option>
                )}
              </select>
              <Input
                value={leadsClientId}
                onChange={(e) => setLeadsClientId(e.target.value.toLowerCase())}
                placeholder="Client ID / Campaign"
                className={cn(
                  "h-9 w-[220px] bg-background",
                  !isLeadsClientIdValid && "border-destructive focus-visible:ring-destructive",
                )}
              />
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="Custom domain (optional)"
                className="h-9 w-[220px] bg-background"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={checkDomainAvailability}
                disabled={!normalizedCustomDomain || domainAvailability.status === "checking"}
              >
                {domainAvailability.status === "checking" ? "Checking…" : "Check"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDomainBuy({ status: "idle" });
                  setDomainBuyOpen(true);
                }}
                disabled={!normalizedCustomDomain || authStatus !== "authed"}
              >
                Buy
              </Button>
            </div>
            <Button
              variant={viewMode === "preview" ? "secondary" : "outline"}
              onClick={() => setViewMode("preview")}
            >
              <Eye className="mr-2" />
              Preview
            </Button>
            <Button
              variant={viewMode === "code" ? "secondary" : "outline"}
              onClick={() => setViewMode("code")}
            >
              <Code2 className="mr-2" />
              Code
            </Button>
            {viewMode === "preview" ? (
              <Button
                variant="outline"
                onClick={() =>
                  setPreviewDevice((d) => (d === "desktop" ? "mobile" : "desktop"))
                }
              >
                {previewDevice === "desktop" ? (
                  <>
                    <Smartphone className="mr-2" />
                    Mobile
                  </>
                ) : (
                  <>
                    <Monitor className="mr-2" />
                    Desktop
                  </>
                )}
              </Button>
            ) : null}
            <Button onClick={publish} disabled={isGenerating}>
              <Rocket className="mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={domainBuyOpen} onOpenChange={setDomainBuyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy domain</DialogTitle>
            <DialogDescription>
              We’ll purchase and attach <span className="font-medium">{normalizedCustomDomain || "your domain"}</span> to your Vercel project.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              value={registrant.firstName}
              onChange={(e) => setRegistrant((r) => ({ ...r, firstName: e.target.value }))}
              placeholder="First name"
              className="h-9 bg-background"
            />
            <Input
              value={registrant.lastName}
              onChange={(e) => setRegistrant((r) => ({ ...r, lastName: e.target.value }))}
              placeholder="Last name"
              className="h-9 bg-background"
            />
            <Input
              value={registrant.email}
              onChange={(e) => setRegistrant((r) => ({ ...r, email: e.target.value }))}
              placeholder="Email"
              className="h-9 bg-background sm:col-span-2"
            />
            <Input
              value={registrant.phone}
              onChange={(e) => setRegistrant((r) => ({ ...r, phone: e.target.value }))}
              placeholder="Phone (E.164, e.g. +9725...)"
              className="h-9 bg-background sm:col-span-2"
            />
            <Input
              value={registrant.companyName}
              onChange={(e) =>
                setRegistrant((r) => ({ ...r, companyName: e.target.value }))
              }
              placeholder="Company (optional)"
              className="h-9 bg-background sm:col-span-2"
            />
            <Input
              value={registrant.address1}
              onChange={(e) => setRegistrant((r) => ({ ...r, address1: e.target.value }))}
              placeholder="Address line 1"
              className="h-9 bg-background sm:col-span-2"
            />
            <Input
              value={registrant.address2}
              onChange={(e) => setRegistrant((r) => ({ ...r, address2: e.target.value }))}
              placeholder="Address line 2 (optional)"
              className="h-9 bg-background sm:col-span-2"
            />
            <Input
              value={registrant.city}
              onChange={(e) => setRegistrant((r) => ({ ...r, city: e.target.value }))}
              placeholder="City"
              className="h-9 bg-background"
            />
            <Input
              value={registrant.state}
              onChange={(e) => setRegistrant((r) => ({ ...r, state: e.target.value }))}
              placeholder="State / region"
              className="h-9 bg-background"
            />
            <Input
              value={registrant.zip}
              onChange={(e) => setRegistrant((r) => ({ ...r, zip: e.target.value }))}
              placeholder="ZIP / postal code"
              className="h-9 bg-background"
            />
            <Input
              value={registrant.country}
              onChange={(e) => setRegistrant((r) => ({ ...r, country: e.target.value }))}
              placeholder="Country (ISO, e.g. IL)"
              className="h-9 bg-background"
            />
          </div>

          {domainBuy.status === "error" ? (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {domainBuy.message}
            </div>
          ) : null}
          {domainBuy.status === "done" ? (
            <div className="mt-4 rounded-xl border border-border bg-card/40 px-4 py-3 text-sm">
              Purchased <span className="font-medium">{domainBuy.domain}</span>
              {domainBuy.orderId ? (
                <>
                  {" "}
                  (order: <span className="font-mono text-xs">{domainBuy.orderId}</span>)
                </>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDomainBuyOpen(false)}>
              Close
            </Button>
            <Button
              onClick={buyDomain}
              disabled={
                !normalizedCustomDomain ||
                domainBuy.status === "buying" ||
                !registrant.firstName.trim() ||
                !registrant.lastName.trim() ||
                !registrant.email.trim() ||
                !registrant.phone.trim() ||
                !registrant.address1.trim() ||
                !registrant.city.trim() ||
                !registrant.state.trim() ||
                !registrant.zip.trim() ||
                !registrant.country.trim()
              }
            >
              {domainBuy.status === "buying" ? "Purchasing…" : "Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mx-auto grid h-[calc(100vh-64px)] max-w-[1400px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ChatPanel
            messages={messages}
            isGenerating={isGenerating}
            onSend={send}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-7">
          {!isLeadsClientIdValid ? (
            <div className="mb-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              Client ID / Campaign can only include{" "}
              <span className="font-medium">a–z</span>,{" "}
              <span className="font-medium">0–9</span>,{" "}
              <span className="font-medium">-</span>,{" "}
              <span className="font-medium">_</span>. Example:{" "}
              <span className="font-medium">acme_q2-ads</span>
            </div>
          ) : null}
          {viewMode === "preview" ? (
            <PreviewPane
              tsxSource={projectLoading ? "" : generated.previewTsx}
              device={previewDevice}
              className="h-full"
            />
          ) : (
            <div className={cn("h-full overflow-auto rounded-2xl border border-border bg-card/40 p-4")}>
              <div className="text-xs font-medium text-muted-foreground">
                Production TSX (used for publish)
              </div>
              <pre className="mt-3 overflow-auto text-xs leading-5 text-foreground">
                <code>{generated.productionTsx}</code>
              </pre>
              <div className="mt-6 text-xs font-medium text-muted-foreground">
                Preview TSX (used for fast sandbox rendering)
              </div>
              <pre className="mt-3 overflow-auto text-xs leading-5 text-foreground">
                <code>{generated.previewTsx}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

