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
import type { SchoolRow } from "./school-table";

const LEVEL_OPTIONS = ["PAUD", "SD", "SMP", "SMA", "SMK", "OTHER"] as const;

interface FormState {
  code: string;
  name: string;
  level: string;
  street: string;
  village: string;
  district: string;
  city: string;
  province: string;
  contactName: string;
  contactPhone: string;
  recipientCapacity: string;
}

const EMPTY: FormState = {
  code: "",
  name: "",
  level: "SD",
  street: "",
  village: "",
  district: "",
  city: "",
  province: "",
  contactName: "",
  contactPhone: "",
  recipientCapacity: "",
};

export function SchoolFormDialog({
  mode,
  school,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  school?: SchoolRow | null;
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
    };
    const recipientCapacity = form.recipientCapacity
      ? Number(form.recipientCapacity)
      : undefined;

    if (mode === "create") {
      const payload = {
        code: form.code,
        name: form.name,
        level: form.level,
        address,
        contactName: form.contactName || undefined,
        contactPhone: form.contactPhone || undefined,
        recipientCapacity,
      };
      return apiPost("/api/v1/schools", payload);
    }
    if (!school) throw new Error("No school selected");
    const payload = {
      name: form.name,
      level: form.level,
      address,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      recipientCapacity,
    };
    return apiPatch(`/api/v1/schools/${school._id}`, payload);
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && school) {
      setForm({
        code: school.code,
        name: school.name,
        level: school.level ?? "SD",
        street: school.address.street,
        village: school.address.village ?? "",
        district: school.address.district ?? "",
        city: school.address.city,
        province: school.address.province,
        contactName: school.contactName ?? "",
        contactPhone: school.contactPhone ?? "",
        recipientCapacity: school.recipientCapacity?.toString() ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, mode, school, setError]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage:
        mode === "create"
          ? "Sekolah berhasil dibuat."
          : "Sekolah berhasil diperbarui.",
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Sekolah" : "Edit Sekolah"}
          </DialogTitle>
          <DialogDescription>Data sekolah penerima.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "create" && (
            <div>
              <Label htmlFor="school-code">Kode</Label>
              <Input
                id="school-code"
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
            <Label htmlFor="school-name">Nama</Label>
            <Input
              id="school-name"
              className="mt-1.5"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="school-level">Jenjang</Label>
            <Select
              value={form.level}
              onValueChange={(value) => set("level", value)}
            >
              <SelectTrigger id="school-level" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="school-street">Alamat</Label>
              <Input
                id="school-street"
                className="mt-1.5"
                value={form.street}
                onChange={(event) => set("street", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="school-village">Kelurahan/Desa</Label>
              <Input
                id="school-village"
                className="mt-1.5"
                value={form.village}
                onChange={(event) => set("village", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="school-district">Kecamatan</Label>
              <Input
                id="school-district"
                className="mt-1.5"
                value={form.district}
                onChange={(event) => set("district", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="school-city">Kota/Kabupaten</Label>
              <Input
                id="school-city"
                className="mt-1.5"
                value={form.city}
                onChange={(event) => set("city", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="school-province">Provinsi</Label>
              <Input
                id="school-province"
                className="mt-1.5"
                value={form.province}
                onChange={(event) => set("province", event.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="school-contact-name">Kontak</Label>
              <Input
                id="school-contact-name"
                className="mt-1.5"
                value={form.contactName}
                onChange={(event) => set("contactName", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="school-contact-phone">Telepon</Label>
              <Input
                id="school-contact-phone"
                className="mt-1.5"
                value={form.contactPhone}
                onChange={(event) => set("contactPhone", event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="school-capacity">Kapasitas Penerima</Label>
            <Input
              id="school-capacity"
              type="number"
              min={0}
              className="mt-1.5"
              value={form.recipientCapacity}
              onChange={(event) => set("recipientCapacity", event.target.value)}
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
