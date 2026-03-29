import * as React from "react";

import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  glow?: boolean;
};

export function ShimmerButton({ className, glow = true, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        "group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,box-shadow] active:translate-y-px",
        glow && "hover:shadow-[0_16px_40px_hsl(var(--foreground)/0.18)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <span className="absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] blur-sm transition-transform duration-700 group-hover:translate-x-[220%]" />
      </span>
      <span className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.22),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(255,255,255,0.14),transparent_60%)]" />
      {props.children}
    </button>
  );
}

