import * as React from "react";

import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  glowClassName?: string;
};

export function GlowCard({
  className,
  glowClassName,
  children,
  ...props
}: Props) {
  return (
    <div
      {...props}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm backdrop-blur",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(420px_circle_at_30%_0%,black,transparent_60%)]",
          glowClassName,
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_20%_0%,hsl(var(--foreground)/0.18),transparent_60%),radial-gradient(700px_circle_at_85%_40%,hsl(var(--foreground)/0.12),transparent_62%)]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

