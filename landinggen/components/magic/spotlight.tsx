import * as React from "react";

import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  from?: string;
  to?: string;
};

export function Spotlight({
  className,
  from = "hsl(var(--foreground)/0.14)",
  to = "transparent",
  ...props
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10", className)}
      {...props}
    >
      <div
        className="absolute left-1/2 top-[-35%] h-[58rem] w-[58rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, ${from}, ${to} 60%)`,
        }}
      />
      <div className="absolute inset-0 [mask-image:radial-gradient(600px_circle_at_50%_18%,black,transparent_70%)]">
        <div className="absolute inset-0 animate-[pulse_7s_ease-in-out_infinite] bg-[radial-gradient(400px_circle_at_30%_20%,hsl(var(--foreground)/0.16),transparent_60%),radial-gradient(520px_circle_at_75%_0%,hsl(var(--foreground)/0.10),transparent_60%)]" />
      </div>
    </div>
  );
}

