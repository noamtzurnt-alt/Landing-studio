import * as React from "react";

import { cn } from "@/lib/utils";
import { GlowCard } from "@/components/magic/glow-card";

export function BentoGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid gap-4 md:grid-cols-12 md:gap-5 [&>*]:min-h-[180px]",
        className,
      )}
      {...props}
    />
  );
}

type BentoCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  colSpan?: string;
  rowSpan?: string;
  variant?: "glass" | "solid";
};

export function BentoCard({
  title,
  description,
  icon,
  colSpan = "md:col-span-6",
  rowSpan,
  variant = "glass",
  className,
  children,
  ...props
}: BentoCardProps) {
  return (
    <GlowCard
      className={cn(
        "group relative overflow-hidden",
        variant === "glass"
          ? "bg-card/40 backdrop-blur-md"
          : "bg-card/70 backdrop-blur",
        colSpan,
        rowSpan,
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_30%_0%,hsl(var(--foreground)/0.10),transparent_60%),radial-gradient(900px_circle_at_80%_30%,hsl(var(--foreground)/0.08),transparent_62%)]" />
      </div>
      <div className="relative flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/60 text-foreground shadow-sm">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{title}</div>
            {description ? (
              <div className="mt-1 text-sm text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
        </div>
        {children ? <div className="mt-4 flex-1">{children}</div> : null}
      </div>
    </GlowCard>
  );
}

