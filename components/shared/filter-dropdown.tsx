"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__all__";

export interface FilterOption {
  value: string;
  label: string;
}

/** Filter by status, date, or organization (PRD §6.3 "Filter Dropdown"). */
export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Semua",
  className,
}: {
  label?: string;
  value: string | undefined;
  options: FilterOption[];
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-text-primary">
          {label}
        </span>
      )}
      <Select
        value={value ?? ALL_VALUE}
        onValueChange={(next) =>
          onChange(next === ALL_VALUE ? undefined : next)
        }
      >
        <SelectTrigger size="sm" className="w-full min-w-36">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
