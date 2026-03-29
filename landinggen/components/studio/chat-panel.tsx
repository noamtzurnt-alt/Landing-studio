"use client";

import * as React from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { stripCodeBlocks } from "@/lib/ui/stripCode";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSend: (prompt: string) => void;
  className?: string;
};

export function ChatPanel({
  messages,
  isGenerating,
  onSend,
  className,
}: Props) {
  const [value, setValue] = React.useState("");

  function submit() {
    const prompt = value.trim();
    if (!prompt) return;
    onSend(prompt);
    setValue("");
  }

  return (
    <div className={cn("flex h-full flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">Chat</div>
          <div className="text-xs text-muted-foreground">
            Ask for a landing page. Then iterate.
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto rounded-2xl border border-border bg-card/40 p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Try: “Create a premium SaaS landing page for an AI meeting notes app
            with bento features, a glowing CTA, and smooth entrance animations.”
          </div>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-background text-foreground ring-1 ring-border",
            )}
          >
            {m.role === "assistant"
              ? (() => {
                  const cleaned = stripCodeBlocks(m.content);
                  if (cleaned) return cleaned;
                  return isGenerating ? "Working on it…" : "Done.";
                })()
              : m.content}
          </div>
        ))}
        {isGenerating ? (
          <div className="max-w-[92%] rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
            Generating…
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-3">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe the landing page you want…"
          className="min-h-24 bg-background"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Press <span className="font-medium">⌘/Ctrl + Enter</span> to send
          </div>
          <Button onClick={submit} disabled={isGenerating || !value.trim()}>
            <Send className="mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

