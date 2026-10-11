"use client";

import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AuditLogFiltersValue {
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

export function AuditLogFilters({
  defaults,
}: {
  defaults: AuditLogFiltersValue;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [action, setAction] = useState(defaults.action ?? "");
  const [resourceType, setResourceType] = useState(defaults.resourceType ?? "");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  function apply(next: AuditLogFiltersValue) {
    const merged = { action, resourceType, from, to, ...next };
    const params = new URLSearchParams();
    if (merged.action) params.set("action", merged.action);
    if (merged.resourceType) params.set("resourceType", merged.resourceType);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    router.push(
      params.size > 0 ? `${pathname}?${params.toString()}` : pathname,
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    apply({});
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <Input
        value={action}
        onChange={(event) => setAction(event.target.value)}
        placeholder="Aksi, contoh: incident.report"
        aria-label="Filter aksi"
        className="w-full max-w-xs"
      />
      <Input
        value={resourceType}
        onChange={(event) => setResourceType(event.target.value)}
        placeholder="Tipe resource, contoh: Incident"
        aria-label="Filter tipe resource"
        className="w-full max-w-xs"
      />
      <DateRangePicker
        from={from}
        to={to}
        onFromChange={(value) => {
          setFrom(value);
          apply({ from: value });
        }}
        onToChange={(value) => {
          setTo(value);
          apply({ to: value });
        }}
      />
      <Button type="submit" variant="outline" size="sm">
        Cari
      </Button>
    </form>
  );
}
