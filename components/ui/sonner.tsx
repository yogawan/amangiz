"use client";

import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-foreground)",
          "--normal-border": "var(--color-border)",
          "--success-bg": "var(--color-surface)",
          "--success-text": "var(--color-success)",
          "--error-bg": "var(--color-surface)",
          "--error-text": "var(--color-danger)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
