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
import { apiGet, apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

interface Option {
  value: string;
  label: string;
}

export function DistributionForm() {
  const router = useRouter();
  const [batchId, setBatchId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("porsi");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [batchOptions, setBatchOptions] = useState<Option[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<Option[]>([]);

  useEffect(() => {
    apiGet<
      { _id: string; batchCode: string; menuName: string; status: string }[]
    >("/api/v1/batches?limit=100")
      .then(({ data }) =>
        setBatchOptions(
          data.map((item) => ({
            value: item._id,
            label: `${item.batchCode} — ${item.menuName} (${item.status})`,
          })),
        ),
      )
      .catch(() => setBatchOptions([]));

    apiGet<{ _id: string; code: string; name: string }[]>(
      "/api/v1/schools?limit=100",
    )
      .then(({ data }) =>
        setSchoolOptions(
          data.map((item) => ({
            value: item._id,
            label: `${item.code} — ${item.name}`,
          })),
        ),
      )
      .catch(() => setSchoolOptions([]));
  }, []);

  const { run, loading, error } = useMutation(async () => {
    const payload = {
      batchId,
      schoolId,
      quantity: Number(quantity),
      unit,
      scheduledAt: scheduledAt || undefined,
      notes: notes || undefined,
    };
    return apiPost<{ _id: string }>("/api/v1/distributions", payload);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({ successMessage: "Distribusi berhasil dibuat." });
    if (result) router.push(`/app/distribution/${result.data._id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Pengiriman</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="distribution-batch">Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger id="distribution-batch" className="mt-1.5 w-full">
                <SelectValue placeholder="Pilih batch" />
              </SelectTrigger>
              <SelectContent>
                {batchOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="distribution-school">Sekolah Penerima</Label>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger id="distribution-school" className="mt-1.5 w-full">
                <SelectValue placeholder="Pilih sekolah" />
              </SelectTrigger>
              <SelectContent>
                {schoolOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="distribution-quantity">Jumlah</Label>
              <Input
                id="distribution-quantity"
                type="number"
                min={0}
                className="mt-1.5"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="distribution-unit">Satuan</Label>
              <Input
                id="distribution-unit"
                className="mt-1.5"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="distribution-schedule">Jadwal Pengiriman</Label>
            <Input
              id="distribution-schedule"
              type="date"
              className="mt-1.5"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="distribution-notes">Catatan</Label>
            <Textarea
              id="distribution-notes"
              className="mt-1.5"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
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
