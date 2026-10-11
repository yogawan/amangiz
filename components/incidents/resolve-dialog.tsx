"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

export function ResolveDialog({
  incidentId,
  incidentCode,
  open,
  onOpenChange,
}: {
  incidentId: string;
  incidentCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [resolutionSummary, setResolutionSummary] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    return apiPost(`/api/v1/incidents/${incidentId}/resolve`, {
      resolutionSummary,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (resolutionSummary.trim().length < 10) {
      setError("Ringkasan penyelesaian wajib diisi (minimal 10 karakter).");
      return;
    }
    const result = await run({
      successMessage: `Insiden ${incidentCode} berhasil diselesaikan.`,
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selesaikan Insiden</DialogTitle>
          <DialogDescription>{incidentCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="resolve-summary">Ringkasan Penyelesaian</Label>
            <Textarea
              id="resolve-summary"
              className="mt-1.5"
              value={resolutionSummary}
              onChange={(event) => setResolutionSummary(event.target.value)}
              placeholder="Apa yang ditemukan dan bagaimana kasus ini diselesaikan"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Selesaikan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
