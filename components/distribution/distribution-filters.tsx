"use client";

import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "delayed", label: "Delayed" },
  { value: "cancelled", label: "Cancelled" },
];

interface DistributionFiltersValue {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}

export function DistributionFilters({
  defaults,
}: {
  defaults: DistributionFiltersValue;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(defaults.search ?? "");
  const [status, setStatus] = useState(defaults.status);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  function apply(next: DistributionFiltersValue) {
    const merged = { search, status, from, to, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
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
        placeholder="Cari kode distribusi..."
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
        className="w-44"
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
