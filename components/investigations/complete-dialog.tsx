"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

/**
 * Completing does not close the parent incident (PRD §8.12) — that still
 * needs its own resolve/close steps. The server already refuses to complete
 * while a corrective action is open, a lab result is still "requested", or no
 * finding has been recorded, with a specific message for each — surfaced here
 * via the mutation's own error state rather than re-derived client-side.
 */
export function CompleteDialog({
  investigationId,
  open,
  onOpenChange,
}: {
  investigationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [conclusion, setConclusion] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    return apiPost(`/api/v1/investigations/${investigationId}/complete`, {
      conclusion,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (conclusion.trim().length < 10) {
      setError("Kesimpulan wajib diisi (minimal 10 karakter).");
      return;
    }
    const result = await run({
      successMessage: "Investigasi berhasil diselesaikan.",
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selesaikan Investigasi</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            Insiden tidak otomatis ditutup — resolusi dan penutupan insiden
            tetap langkah terpisah.
          </p>
          <div>
            <Label htmlFor="complete-conclusion">Kesimpulan</Label>
            <Textarea
              id="complete-conclusion"
              className="mt-1.5"
              value={conclusion}
              onChange={(event) => setConclusion(event.target.value)}
              placeholder="Ringkasan hasil investigasi"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
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
              {loading ? "Menyimpan..." : "Selesaikan Investigasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
