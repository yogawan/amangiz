"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

interface Option {
  value: string;
  label: string;
}

interface IngredientRow {
  id: string;
  supplierId: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  supplierBatchCode: string;
}

function emptyIngredient(): IngredientRow {
  return {
    id: globalThis.crypto.randomUUID(),
    supplierId: "",
    ingredientName: "",
    quantity: "",
    unit: "",
    supplierBatchCode: "",
  };
}

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

export interface BatchFormInitialData {
  _id: string;
  menuName: string;
  productionDate: string;
  expiryAt?: string;
  productionNotes?: string;
  sppgId?: string;
  ingredients: {
    supplierId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    supplierBatchCode?: string;
  }[];
}

export function BatchForm({
  mode,
  canPickSppg = false,
  initial,
}: {
  mode: "create" | "edit";
  canPickSppg?: boolean;
  initial?: BatchFormInitialData;
}) {
  const router = useRouter();
  const [menuName, setMenuName] = useState(initial?.menuName ?? "");
  const [productionDate, setProductionDate] = useState(
    initial ? toDateInputValue(initial.productionDate) : "",
  );
  const [expiryAt, setExpiryAt] = useState(
    initial?.expiryAt ? toDateInputValue(initial.expiryAt) : "",
  );
  const [productionNotes, setProductionNotes] = useState(
    initial?.productionNotes ?? "",
  );
  const [sppgId, setSppgId] = useState(initial?.sppgId ?? "");
  const [sppgOptions, setSppgOptions] = useState<Option[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<Option[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients.map((item) => ({
      ...item,
      id: globalThis.crypto.randomUUID(),
      quantity: String(item.quantity),
      supplierBatchCode: item.supplierBatchCode ?? "",
    })) ?? [],
  );

  useEffect(() => {
    apiGet<{ _id: string; code: string; name: string }[]>(
      "/api/v1/suppliers?limit=100",
    )
      .then(({ data }) =>
        setSupplierOptions(
          data.map((item) => ({
            value: item._id,
            label: `${item.code} — ${item.name}`,
          })),
        ),
      )
      .catch(() => setSupplierOptions([]));
  }, []);

  useEffect(() => {
    if (!canPickSppg) return;
    apiGet<{ _id: string; code: string; name: string }[]>(
      "/api/v1/sppgs?limit=100",
    )
      .then(({ data }) =>
        setSppgOptions(
          data.map((item) => ({
            value: item._id,
            label: `${item.code} — ${item.name}`,
          })),
        ),
      )
      .catch(() => setSppgOptions([]));
  }, [canPickSppg]);

  const { run, loading, error } = useMutation(async () => {
    const payload = {
      menuName,
      productionDate,
      expiryAt: expiryAt || undefined,
      productionNotes: productionNotes || undefined,
      ingredients: ingredients
        .filter((row) => row.supplierId && row.ingredientName && row.quantity)
        .map((row) => ({
          supplierId: row.supplierId,
          ingredientName: row.ingredientName,
          quantity: Number(row.quantity),
          unit: row.unit,
          supplierBatchCode: row.supplierBatchCode || undefined,
        })),
    };

    if (mode === "create") {
      const body = canPickSppg
        ? { ...payload, sppgId: sppgId || undefined }
        : payload;
      return apiPost<{ _id: string }>("/api/v1/batches", body);
    }
    if (!initial) throw new Error("No batch to update");
    return apiPatch<{ _id: string }>(`/api/v1/batches/${initial._id}`, payload);
  });

  function addIngredient() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }
  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((row) => row.id !== id));
  }
  function updateIngredient(id: string, patch: Partial<IngredientRow>) {
    setIngredients((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage:
        mode === "create"
          ? "Batch berhasil dibuat."
          : "Batch berhasil diperbarui.",
    });
    if (!result) return;
    const id = mode === "create" ? result.data._id : initial?._id;
    if (id) router.push(`/app/batches/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Batch</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canPickSppg && mode === "create" && (
            <div>
              <Label htmlFor="batch-sppg">SPPG</Label>
              <Select value={sppgId} onValueChange={setSppgId}>
                <SelectTrigger id="batch-sppg" className="mt-1.5 w-full">
                  <SelectValue placeholder="Pilih SPPG" />
                </SelectTrigger>
                <SelectContent>
                  {sppgOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="batch-menu">Nama Menu</Label>
            <Input
              id="batch-menu"
              className="mt-1.5"
              value={menuName}
              onChange={(event) => setMenuName(event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="batch-production-date">Tanggal Produksi</Label>
              <Input
                id="batch-production-date"
                type="date"
                className="mt-1.5"
                value={productionDate}
                onChange={(event) => setProductionDate(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="batch-expiry">Tanggal Kedaluwarsa</Label>
              <Input
                id="batch-expiry"
                type="date"
                className="mt-1.5"
                value={expiryAt}
                onChange={(event) => setExpiryAt(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="batch-notes">Catatan Produksi</Label>
            <Textarea
              id="batch-notes"
              className="mt-1.5"
              value={productionNotes}
              onChange={(event) => setProductionNotes(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bahan Baku</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
            >
              + Tambah Bahan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ingredients.length === 0 && (
            <p className="text-sm text-muted">
              Belum ada bahan baku ditambahkan.
            </p>
          )}
          {ingredients.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3"
            >
              <div className="min-w-48 flex-1">
                <Label>Pemasok</Label>
                <Select
                  value={row.supplierId}
                  onValueChange={(value) =>
                    updateIngredient(row.id, { supplierId: value })
                  }
                >
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue placeholder="Pilih pemasok" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-40 flex-1">
                <Label>Nama Bahan</Label>
                <Input
                  className="mt-1.5"
                  value={row.ingredientName}
                  onChange={(event) =>
                    updateIngredient(row.id, {
                      ingredientName: event.target.value,
                    })
                  }
                />
              </div>
              <div className="w-24">
                <Label>Jumlah</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  value={row.quantity}
                  onChange={(event) =>
                    updateIngredient(row.id, { quantity: event.target.value })
                  }
                />
              </div>
              <div className="w-20">
                <Label>Satuan</Label>
                <Input
                  className="mt-1.5"
                  value={row.unit}
                  onChange={(event) =>
                    updateIngredient(row.id, { unit: event.target.value })
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeIngredient(row.id)}
              >
                Hapus
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Batal
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
