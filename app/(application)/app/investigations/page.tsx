import { FileSearch } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Investigasi — AMANGIZ" };

// Phase 0 placeholder — built out in Phase 4 (UI_PLAN.md).
export default function InvestigationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text-primary">Investigasi</h1>
      <EmptyState
        icon={FileSearch}
        title="Halaman ini belum dibangun"
        description="Investigasi dan tindak lanjut akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
