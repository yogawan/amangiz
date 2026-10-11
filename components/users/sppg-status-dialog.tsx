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
import type { SppgRow } from "./sppg-table";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
] as const;

export function SppgStatusDialog({
  sppg,
  open,
  onOpenChange,
}: {
  sppg: SppgRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<string>("active");
  const [reason, setReason] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    if (!sppg) return;
    return apiPatch(`/api/v1/sppgs/${sppg._id}/status`, {
      status,
      reason: reason || undefined,
    });
  });

  useEffect(() => {
    if (!open || !sppg) return;
    setError(null);
    setStatus(sppg.status);
    setReason("");
  }, [open, sppg, setError]);

  const requiresReason = status !== "active";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (requiresReason && !reason.trim()) {
      setError("Alasan wajib diisi untuk status selain active.");
      return;
    }
    const result = await run({ successMessage: "Status SPPG diperbarui." });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Status SPPG</DialogTitle>
          <DialogDescription>{sppg?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="sppg-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="sppg-status" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {requiresReason && (
            <div>
              <Label htmlFor="sppg-reason">Alasan</Label>
              <Textarea
                id="sppg-reason"
                className="mt-1.5"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Jelaskan alasan perubahan status"
              />
            </div>
          )}
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
