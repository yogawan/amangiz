"use client";

import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "reported", label: "Reported" },
  { value: "triaged", label: "Triaged" },
  { value: "containment_in_progress", label: "Containment In Progress" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITY_OPTIONS = [
  { value: "unassessed", label: "Unassessed" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface IncidentFiltersValue {
  search?: string;
  status?: string;
  severity?: string;
  from?: string;
  to?: string;
}

export function IncidentFilters({
  defaults,
}: {
  defaults: IncidentFiltersValue;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(defaults.search ?? "");
  const [status, setStatus] = useState(defaults.status);
  const [severity, setSeverity] = useState(defaults.severity);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  function apply(next: IncidentFiltersValue) {
    const merged = { search, status, severity, from, to, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
    if (merged.severity) params.set("severity", merged.severity);
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
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cari kode, judul, atau deskripsi..."
        containerClassName="w-full max-w-xs"
      />
      <FilterDropdown
        label="Status"
        value={status}
        onChange={(value) => {
          setStatus(value);
          apply({ status: value });
        }}
        options={STATUS_OPTIONS}
        className="w-48"
      />
      <FilterDropdown
        label="Severity"
        value={severity}
        onChange={(value) => {
          setSeverity(value);
          apply({ severity: value });
        }}
        options={SEVERITY_OPTIONS}
        className="w-40"
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
