"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

export function RunRiskAssessmentButton({
  incidentId,
  incidentCode,
}: {
  incidentId: string;
  incidentCode: string;
}) {
  const [open, setOpen] = useState(false);
  const { run, loading } = useMutation(() =>
    apiPost(`/api/v1/incidents/${incidentId}/risk-assessments`),
  );

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Jalankan Penilaian Risiko
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Jalankan penilaian risiko?"
        description={`Sistem akan mengevaluasi data yang tersedia untuk insiden ${incidentCode} menggunakan aturan rule-based.`}
        confirmLabel={loading ? "Memproses..." : "Jalankan"}
        onConfirm={async () => {
          await run({
            successMessage: "Penilaian risiko berhasil dijalankan.",
          });
          setOpen(false);
        }}
      />
    </>
  );
}
