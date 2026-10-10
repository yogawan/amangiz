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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

/** PRD §8.9: records receipt at the school. */
export function ReceiveDialog({
  distributionId,
  distributionCode,
  open,
  onOpenChange,
}: {
  distributionId: string;
  distributionCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [temperature, setTemperature] = useState("");
  const [notes, setNotes] = useState("");

  const { run, loading, error } = useMutation(async () => {
    return apiPost(`/api/v1/distributions/${distributionId}/receive`, {
      receivedTemperature: temperature ? Number(temperature) : undefined,
      notes: notes || undefined,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage: `Distribusi ${distributionCode} berhasil dicatat sebagai diterima.`,
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Penerimaan</DialogTitle>
          <DialogDescription>Distribusi {distributionCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="receive-temperature">Suhu Saat Diterima (°C)</Label>
            <Input
              id="receive-temperature"
              type="number"
              className="mt-1.5"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="receive-notes">Catatan</Label>
            <Textarea
              id="receive-notes"
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
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Konfirmasi Penerimaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
