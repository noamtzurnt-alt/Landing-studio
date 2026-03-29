import * as React from "react";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function AnimatedGridBackground({ className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,hsl(var(--foreground)/0.08)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.08)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute left-1/2 top-[-30%] h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--foreground)/0.14),transparent_55%)] blur-3xl" />
      <div className="absolute inset-0 [mask-image:radial-gradient(600px_circle_at_50%_20%,black,transparent_65%)]">
        <div className="absolute inset-0 animate-[pulse_6s_ease-in-out_infinite] bg-[radial-gradient(400px_circle_at_30%_20%,hsl(var(--foreground)/0.14),transparent_60%),radial-gradient(480px_circle_at_70%_0%,hsl(var(--foreground)/0.10),transparent_60%)]" />
      </div>
    </div>
  );
}

