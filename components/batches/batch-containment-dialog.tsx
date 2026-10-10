"use client";

import { type FormEvent, useEffect, useState } from "react";
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

type Action = "hold" | "release" | "recall";

const META: Record<
  Action,
  { title: string; confirmLabel: string; destructive: boolean }
> = {
  hold: { title: "Tahan Batch", confirmLabel: "Tahan", destructive: false },
  release: {
    title: "Lepas Penahanan Batch",
    confirmLabel: "Lepas",
    destructive: false,
  },
  recall: { title: "Recall Batch", confirmLabel: "Recall", destructive: true },
};

/** PRD §8.8: hold/release/recall each require a stated reason, recorded in the audit log. */
export function BatchContainmentDialog({
  batchId,
  batchCode,
  action,
  onOpenChange,
}: {
  batchId: string;
  batchCode: string;
  action: Action | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    if (!action) return;
    return apiPost(`/api/v1/batches/${batchId}/${action}`, {
      reason,
      notes: notes || undefined,
    });
  });

  useEffect(() => {
    if (!action) return;
    setReason("");
    setNotes("");
    setError(null);
  }, [action, setError]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError("Alasan wajib diisi (minimal 5 karakter).");
      return;
    }
    const result = await run({
      successMessage: `Batch ${batchCode} berhasil di-${action}.`,
    });
    if (result) onOpenChange(false);
  }

  const meta = action ? META[action] : null;

  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meta?.title}</DialogTitle>
          <DialogDescription>Batch {batchCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="containment-reason">Alasan</Label>
            <Textarea
              id="containment-reason"
              className="mt-1.5"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Jelaskan alasan tindakan ini"
              required
            />
          </div>
          <div>
            <Label htmlFor="containment-notes">Catatan Tambahan</Label>
            <Textarea
              id="containment-notes"
              className="mt-1.5"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
            <Button
              type="submit"
              disabled={loading}
              className={
                meta?.destructive ? "bg-danger hover:bg-danger/90" : undefined
              }
            >
              {loading ? "Memproses..." : meta?.confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
