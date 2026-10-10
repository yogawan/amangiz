"use client";

import { Search } from "lucide-react";
import type * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"input"> & { containerClassName?: string }) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <Input type="search" className={cn("pl-9", className)} {...props} />
    </div>
  );
}
