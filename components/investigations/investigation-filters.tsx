"use client";

import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_external_result", label: "Awaiting External Result" },
  { value: "completed", label: "Completed" },
];

const ROOT_CAUSE_OPTIONS = [
  { value: "undetermined", label: "Undetermined" },
  { value: "under_review", label: "Under Review" },
  { value: "determined", label: "Determined" },
];

interface InvestigationFiltersValue {
  status?: string;
  rootCauseStatus?: string;
}

export function InvestigationFilters({
  defaults,
}: {
  defaults: InvestigationFiltersValue;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState(defaults.status);
  const [rootCauseStatus, setRootCauseStatus] = useState(
    defaults.rootCauseStatus,
  );

  function apply(next: InvestigationFiltersValue) {
    const merged = { status, rootCauseStatus, ...next };
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.rootCauseStatus) {
      params.set("rootCauseStatus", merged.rootCauseStatus);
    }
    router.push(
      params.size > 0 ? `${pathname}?${params.toString()}` : pathname,
    );
  }

  function handleReset(event: FormEvent) {
    event.preventDefault();
    setStatus(undefined);
    setRootCauseStatus(undefined);
    router.push(pathname);
  }

  return (
    <form
      onSubmit={handleReset}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <FilterDropdown
        label="Status"
        value={status}
        onChange={(value) => {
          setStatus(value);
          apply({ status: value });
        }}
        options={STATUS_OPTIONS}
        className="w-56"
      />
      <FilterDropdown
        label="Status Akar Masalah"
        value={rootCauseStatus}
        onChange={(value) => {
          setRootCauseStatus(value);
          apply({ rootCauseStatus: value });
        }}
        options={ROOT_CAUSE_OPTIONS}
        className="w-48"
      />
      <Button type="submit" variant="outline" size="sm">
        Reset
      </Button>
    </form>
  );
}
