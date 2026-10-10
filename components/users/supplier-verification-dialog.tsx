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
import type { SupplierRow } from "./supplier-table";

const OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

/** PRD 7.5: verification must reflect a real decision, so a rejection needs notes. */
export function SupplierVerificationDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: SupplierRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [verificationStatus, setVerificationStatus] =
    useState<string>("pending");
  const [notes, setNotes] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    if (!supplier) return;
    return apiPatch(`/api/v1/suppliers/${supplier._id}/verification`, {
      verificationStatus,
      notes: notes || undefined,
    });
  });

  useEffect(() => {
    if (!open || !supplier) return;
    setError(null);
    setVerificationStatus(supplier.verificationStatus);
    setNotes("");
  }, [open, supplier, setError]);

  const requiresNotes = verificationStatus === "rejected";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (requiresNotes && !notes.trim()) {
      setError("Penolakan harus menyertakan catatan.");
      return;
    }
    const result = await run({
      successMessage: "Status verifikasi diperbarui.",
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verifikasi Pemasok</DialogTitle>
          <DialogDescription>{supplier?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="supplier-verification">Status Verifikasi</Label>
            <Select
              value={verificationStatus}
              onValueChange={setVerificationStatus}
            >
              <SelectTrigger
                id="supplier-verification"
                className="mt-1.5 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="supplier-notes">
              Catatan {requiresNotes && "(wajib)"}
            </Label>
            <Textarea
              id="supplier-notes"
              className="mt-1.5"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Catatan hasil verifikasi"
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
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
