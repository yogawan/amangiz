import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Audit Log — AMANGIZ" };

// Phase 0 placeholder — built out in Phase 5 (UI_PLAN.md).
export default function AuditLogPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text-primary">Audit Log</h1>
      <EmptyState
        icon={ClipboardList}
        title="Halaman ini belum dibangun"
        description="Riwayat aktivitas akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
