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

const INCIDENT_TYPE_OPTIONS = [
  { value: "suspected_food_safety", label: "Suspected Food Safety" },
  { value: "temperature_violation", label: "Temperature Violation" },
  { value: "distribution_issue", label: "Distribution Issue" },
  { value: "packaging_issue", label: "Packaging Issue" },
  { value: "other", label: "Other" },
] as const;

interface Option {
  value: string;
  label: string;
}

const NONE_VALUE = "__none__";

export function IncidentReportForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incidentType, setIncidentType] = useState<string>(
    "suspected_food_safety",
  );
  const [occurredAt, setOccurredAt] = useState("");
  const [reportedAffectedCount, setReportedAffectedCount] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [batchId, setBatchId] = useState<string>(NONE_VALUE);
  const [distributionId, setDistributionId] = useState<string>(NONE_VALUE);
  const [batchOptions, setBatchOptions] = useState<Option[]>([]);
  const [distributionOptions, setDistributionOptions] = useState<Option[]>([]);

  useEffect(() => {
    apiGet<{ _id: string; batchCode: string; menuName: string }[]>(
      "/api/v1/batches?limit=100",
    )
      .then(({ data }) =>
        setBatchOptions(
          data.map((item) => ({
            value: item._id,
            label: `${item.batchCode} — ${item.menuName}`,
          })),
        ),
      )
      .catch(() => setBatchOptions([]));

    apiGet<{ _id: string; distributionCode: string }[]>(
      "/api/v1/distributions?limit=100",
    )
      .then(({ data }) =>
        setDistributionOptions(
          data.map((item) => ({
            value: item._id,
            label: item.distributionCode,
          })),
        ),
      )
      .catch(() => setDistributionOptions([]));
  }, []);

  const { run, loading, error } = useMutation(async () => {
    const symptomsReported = symptoms
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const payload = {
      title,
      description,
      incidentType,
      occurredAt: occurredAt || undefined,
      reportedAffectedCount: reportedAffectedCount
        ? Number(reportedAffectedCount)
        : undefined,
      symptomsReported:
        symptomsReported.length > 0 ? symptomsReported : undefined,
      batchId: batchId === NONE_VALUE ? undefined : batchId,
      distributionId:
        distributionId === NONE_VALUE ? undefined : distributionId,
    };
    return apiPost<{ _id: string }>("/api/v1/incidents", payload);
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage: "Insiden berhasil dilaporkan.",
    });
    if (result) router.push(`/app/incidents/${result.data._id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Laporan Insiden</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="incident-title">Judul</Label>
            <Input
              id="incident-title"
              className="mt-1.5"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={5}
            />
          </div>
          <div>
            <Label htmlFor="incident-description">Kronologi / Deskripsi</Label>
            <Textarea
              id="incident-description"
              className="mt-1.5"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              minLength={10}
              placeholder="Jelaskan apa yang terjadi, kapan, dan di mana."
            />
          </div>
          <div>
            <Label htmlFor="incident-type">Jenis Insiden</Label>
            <Select value={incidentType} onValueChange={setIncidentType}>
              <SelectTrigger id="incident-type" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="incident-occurred">Waktu Kejadian</Label>
              <Input
                id="incident-occurred"
                type="date"
                className="mt-1.5"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="incident-affected">
                Jumlah Terdampak (dilaporkan)
              </Label>
              <Input
                id="incident-affected"
                type="number"
                min={0}
                className="mt-1.5"
                value={reportedAffectedCount}
                onChange={(event) =>
                  setReportedAffectedCount(event.target.value)
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="incident-symptoms">Gejala yang Dilaporkan</Label>
            <Input
              id="incident-symptoms"
              className="mt-1.5"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Pisahkan dengan koma, misal: mual, pusing"
            />
            <p className="mt-1 text-xs text-muted">
              Catatan observasi saja — bukan diagnosis.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kaitkan Batch / Distribusi (opsional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="incident-batch">Batch Terkait</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger id="incident-batch" className="mt-1.5 w-full">
                <SelectValue placeholder="Tidak terkait batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Tidak terkait batch</SelectItem>
                {batchOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="incident-distribution">Distribusi Terkait</Label>
            <Select value={distributionId} onValueChange={setDistributionId}>
              <SelectTrigger
                id="incident-distribution"
                className="mt-1.5 w-full"
              >
                <SelectValue placeholder="Tidak terkait distribusi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  Tidak terkait distribusi
                </SelectItem>
                {distributionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {loading ? "Mengirim..." : "Lapor Insiden"}
        </Button>
      </div>
    </form>
  );
}
