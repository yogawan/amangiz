"use client";

import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";

export function TraceabilitySearch({ defaultCode }: { defaultCode?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [code, setCode] = useState(defaultCode ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    router.push(
      trimmed ? `${pathname}?code=${encodeURIComponent(trimmed)}` : pathname,
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <SearchInput
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Masukkan kode batch, misal BTH-20261010-7K3QX"
        containerClassName="w-full max-w-sm"
      />
      <Button type="submit" size="sm">
        Telusuri
      </Button>
    </form>
  );
}
