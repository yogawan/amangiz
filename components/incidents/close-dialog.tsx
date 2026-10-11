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

export function CloseDialog({
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
  const [note, setNote] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    return apiPost(`/api/v1/incidents/${incidentId}/close`, { note });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (note.trim().length < 5) {
      setError("Catatan penutupan wajib diisi (minimal 5 karakter).");
      return;
    }
    const result = await run({
      successMessage: `Insiden ${incidentCode} berhasil ditutup.`,
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tutup Insiden</DialogTitle>
          <DialogDescription>{incidentCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="close-note">Catatan Penutupan</Label>
            <Textarea
              id="close-note"
              className="mt-1.5"
              value={note}
              onChange={(event) => setNote(event.target.value)}
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
              {loading ? "Menyimpan..." : "Tutup Insiden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
