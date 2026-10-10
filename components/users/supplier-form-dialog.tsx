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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiPatch, apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";
import type { SupplierRow } from "./supplier-table";

const SUPPLIER_TYPE_OPTIONS = [
  { value: "agriculture", label: "Agriculture" },
  { value: "livestock", label: "Livestock" },
  { value: "seafood", label: "Seafood" },
  { value: "processed_food", label: "Processed Food" },
  { value: "other", label: "Other" },
] as const;

interface FormState {
  code: string;
  name: string;
  supplierType: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: string;
}

const EMPTY: FormState = {
  code: "",
  name: "",
  supplierType: "agriculture",
  address: "",
  contactName: "",
  contactPhone: "",
  status: "active",
};

export function SupplierFormDialog({
  mode,
  supplier,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  supplier?: SupplierRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);

  const { run, loading, error, setError } = useMutation(async () => {
    if (mode === "create") {
      const payload = {
        code: form.code,
        name: form.name,
        supplierType: form.supplierType,
        address: form.address,
        contactName: form.contactName || undefined,
        contactPhone: form.contactPhone || undefined,
        status: form.status,
      };
      return apiPost("/api/v1/suppliers", payload);
    }
    if (!supplier) throw new Error("No supplier selected");
    const payload = {
      name: form.name,
      supplierType: form.supplierType,
      address: form.address,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      status: form.status,
    };
    return apiPatch(`/api/v1/suppliers/${supplier._id}`, payload);
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && supplier) {
      setForm({
        code: supplier.code,
        name: supplier.name,
        supplierType: supplier.supplierType,
        address: supplier.address,
        contactName: supplier.contactName ?? "",
        contactPhone: supplier.contactPhone ?? "",
        status: supplier.status,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, mode, supplier, setError]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage:
        mode === "create"
          ? "Pemasok berhasil dibuat."
          : "Pemasok berhasil diperbarui.",
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Pemasok" : "Edit Pemasok"}
          </DialogTitle>
          <DialogDescription>Data pemasok bahan pangan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "create" && (
            <div>
              <Label htmlFor="supplier-code">Kode</Label>
              <Input
                id="supplier-code"
                className="mt-1.5"
                value={form.code}
                onChange={(event) =>
                  set("code", event.target.value.toUpperCase())
                }
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="supplier-name">Nama</Label>
            <Input
              id="supplier-name"
              className="mt-1.5"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="supplier-type">Jenis Pemasok</Label>
            <Select
              value={form.supplierType}
              onValueChange={(value) => set("supplierType", value)}
            >
              <SelectTrigger id="supplier-type" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="supplier-address">Alamat</Label>
            <Input
              id="supplier-address"
              className="mt-1.5"
              value={form.address}
              onChange={(event) => set("address", event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="supplier-contact-name">Kontak</Label>
              <Input
                id="supplier-contact-name"
                className="mt-1.5"
                value={form.contactName}
                onChange={(event) => set("contactName", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supplier-contact-phone">Telepon</Label>
              <Input
                id="supplier-contact-phone"
                className="mt-1.5"
                value={form.contactPhone}
                onChange={(event) => set("contactPhone", event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="supplier-status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => set("status", value)}
            >
              <SelectTrigger id="supplier-status" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
