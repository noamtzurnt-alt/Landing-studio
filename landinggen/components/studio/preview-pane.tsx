"use client";

import * as React from "react";

import { buildPreviewHtml } from "@/lib/preview/buildPreviewHtml";
import { cn } from "@/lib/utils";

type Props = {
  tsxSource: string;
  device?: "desktop" | "mobile";
  className?: string;
};

export function PreviewPane({ tsxSource, device = "desktop", className }: Props) {
  const srcDoc = React.useMemo(
    () => buildPreviewHtml(tsxSource || "function Landing(){ return <div /> }"),
    [tsxSource],
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {tsxSource.trim().length === 0 ? (
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-border bg-card/40 p-6 text-center">
          <div className="max-w-sm">
            <div className="text-sm font-semibold tracking-tight">Preview</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Your generated landing page will appear here.
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto h-full w-full",
            device === "mobile" && "max-w-[390px]",
          )}
        >
          <iframe
            title="Live Preview"
            sandbox="allow-scripts"
            className="h-full w-full rounded-2xl border border-border bg-black"
            srcDoc={srcDoc}
          />
        </div>
      )}
    </div>
  );
}

