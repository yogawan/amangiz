import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Analisis Risiko — AMANGIZ" };

// Phase 0 placeholder — built out in Phase 4 (UI_PLAN.md).
export default function RiskAnalysisPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text-primary">
        Analisis Risiko
      </h1>
      <EmptyState
        icon={ShieldAlert}
        title="Halaman ini belum dibangun"
        description="Ringkasan prioritas dan faktor risiko akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
