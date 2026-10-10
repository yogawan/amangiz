import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Insiden — AMANGIZ" };

// Phase 0 placeholder — built out in Phase 4 (UI_PLAN.md).
export default function IncidentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text-primary">Insiden</h1>
      <EmptyState
        icon={AlertTriangle}
        title="Halaman ini belum dibangun"
        description="Pelaporan dan pengelolaan insiden akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
