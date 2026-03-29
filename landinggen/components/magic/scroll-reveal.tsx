"use client";

import * as React from "react";
import { motion, type MotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

type Props = MotionProps & {
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "main" | "article";
  children?: React.ReactNode;
  delay?: number;
};

export function ScrollReveal({
  className,
  as = "div",
  children,
  delay = 0,
  ...props
}: Props) {
  const Comp = motion[as] as unknown as React.ComponentType<
    MotionProps & { className?: string; children?: React.ReactNode }
  >;

  return (
    <Comp
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.9, 0.2, 1] }}
      className={cn(className)}
      {...props}
    >
      {children}
    </Comp>
  );
}

