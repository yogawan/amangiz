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
import { apiPatch, apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";
import type { SppgRow } from "./sppg-table";

interface FormState {
  code: string;
  name: string;
  street: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  contactName: string;
  contactPhone: string;
}

const EMPTY: FormState = {
  code: "",
  name: "",
  street: "",
  village: "",
  district: "",
  city: "",
  province: "",
  postalCode: "",
  contactName: "",
  contactPhone: "",
};

export function SppgFormDialog({
  mode,
  sppg,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  sppg?: SppgRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);

  const { run, loading, error, setError } = useMutation(async () => {
    const address = {
      street: form.street,
      village: form.village || undefined,
      district: form.district || undefined,
      city: form.city,
      province: form.province,
      postalCode: form.postalCode || undefined,
    };
    if (mode === "create") {
      const payload = {
        code: form.code,
        name: form.name,
        address,
        contactName: form.contactName || undefined,
        contactPhone: form.contactPhone || undefined,
      };
      return apiPost("/api/v1/sppgs", payload);
    }
    if (!sppg) throw new Error("No SPPG selected");
    const payload = {
      name: form.name,
      address,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
    };
    return apiPatch(`/api/v1/sppgs/${sppg._id}`, payload);
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && sppg) {
      setForm({
        code: sppg.code,
        name: sppg.name,
        street: sppg.address.street,
        village: sppg.address.village ?? "",
        district: sppg.address.district ?? "",
        city: sppg.address.city,
        province: sppg.address.province,
        postalCode: sppg.address.postalCode ?? "",
        contactName: sppg.contactName ?? "",
        contactPhone: sppg.contactPhone ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, mode, sppg, setError]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage:
        mode === "create"
          ? "SPPG berhasil dibuat."
          : "SPPG berhasil diperbarui.",
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah SPPG" : "Edit SPPG"}
          </DialogTitle>
          <DialogDescription>
            Data unit layanan pemenuhan gizi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "create" && (
            <div>
              <Label htmlFor="sppg-code">Kode</Label>
              <Input
                id="sppg-code"
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
            <Label htmlFor="sppg-name">Nama</Label>
            <Input
              id="sppg-name"
              className="mt-1.5"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="sppg-street">Alamat</Label>
              <Input
                id="sppg-street"
                className="mt-1.5"
                value={form.street}
                onChange={(event) => set("street", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="sppg-village">Kelurahan/Desa</Label>
              <Input
                id="sppg-village"
                className="mt-1.5"
                value={form.village}
                onChange={(event) => set("village", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sppg-district">Kecamatan</Label>
              <Input
                id="sppg-district"
                className="mt-1.5"
                value={form.district}
                onChange={(event) => set("district", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sppg-city">Kota/Kabupaten</Label>
              <Input
                id="sppg-city"
                className="mt-1.5"
                value={form.city}
                onChange={(event) => set("city", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="sppg-province">Provinsi</Label>
              <Input
                id="sppg-province"
                className="mt-1.5"
                value={form.province}
                onChange={(event) => set("province", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="sppg-postal">Kode Pos</Label>
              <Input
                id="sppg-postal"
                className="mt-1.5"
                value={form.postalCode}
                onChange={(event) => set("postalCode", event.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sppg-contact-name">Kontak</Label>
              <Input
                id="sppg-contact-name"
                className="mt-1.5"
                value={form.contactName}
                onChange={(event) => set("contactName", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sppg-contact-phone">Telepon</Label>
              <Input
                id="sppg-contact-phone"
                className="mt-1.5"
                value={form.contactPhone}
                onChange={(event) => set("contactPhone", event.target.value)}
              />
            </div>
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
