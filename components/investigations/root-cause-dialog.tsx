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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

const OPTIONS = ["undetermined", "under_review", "determined"];

export function RootCauseDialog({
  investigationId,
  currentStatus,
  currentSummary,
  open,
  onOpenChange,
}: {
  investigationId: string;
  currentStatus: string;
  currentSummary?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rootCauseStatus, setRootCauseStatus] = useState(currentStatus);
  const [rootCauseSummary, setRootCauseSummary] = useState(
    currentSummary ?? "",
  );

  const { run, loading, error, setError } = useMutation(async () => {
    return apiPatch(`/api/v1/investigations/${investigationId}`, {
      rootCauseStatus,
      rootCauseSummary: rootCauseSummary || undefined,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (
      rootCauseStatus === "determined" &&
      rootCauseSummary.trim().length < 10
    ) {
      setError(
        'Status "determined" wajib menyertakan ringkasan (minimal 10 karakter).',
      );
      return;
    }
    const result = await run({
      successMessage: "Status akar masalah diperbarui.",
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Perbarui Status Akar Masalah</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="root-cause-status">Status</Label>
            <Select value={rootCauseStatus} onValueChange={setRootCauseStatus}>
              <SelectTrigger id="root-cause-status" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="root-cause-summary">
              Ringkasan {rootCauseStatus === "determined" && "(wajib)"}
            </Label>
            <Textarea
              id="root-cause-summary"
              className="mt-1.5"
              value={rootCauseSummary}
              onChange={(event) => setRootCauseSummary(event.target.value)}
              placeholder="Hanya berdasarkan pemeriksaan yang dapat diverifikasi"
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
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
