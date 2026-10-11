"use client";

import { type FormEvent, useState } from "react";
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
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

export interface SampleTestingData {
  status: string;
  laboratoryName?: string;
  referenceNumber?: string;
  resultSummary?: string;
  resultDocumentUrl?: string;
  resultReceivedAt?: string;
}

const STATUS_OPTIONS = [
  { value: "not_requested", label: "Not Requested" },
  { value: "requested", label: "Requested" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

/**
 * PRD §2.5, §7.11: a result may only be recorded from a verifiable source —
 * the laboratory name is required once testing is requested, and reference
 * number / summary / receipt date are required once it's completed.
 */
export function LabResultSection({
  investigationId,
  sampleTesting,
  canEdit,
}: {
  investigationId: string;
  sampleTesting: SampleTestingData | null;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState(
    sampleTesting?.status ?? "not_requested",
  );
  const [laboratoryName, setLaboratoryName] = useState(
    sampleTesting?.laboratoryName ?? "",
  );
  const [referenceNumber, setReferenceNumber] = useState(
    sampleTesting?.referenceNumber ?? "",
  );
  const [resultSummary, setResultSummary] = useState(
    sampleTesting?.resultSummary ?? "",
  );
  const [resultDocumentUrl, setResultDocumentUrl] = useState(
    sampleTesting?.resultDocumentUrl ?? "",
  );
  const [resultReceivedAt, setResultReceivedAt] = useState(
    sampleTesting?.resultReceivedAt
      ? sampleTesting.resultReceivedAt.slice(0, 10)
      : "",
  );

  const { run, loading, error } = useMutation(async () => {
    return apiPost(`/api/v1/investigations/${investigationId}/lab-results`, {
      status,
      laboratoryName: laboratoryName || undefined,
      referenceNumber: referenceNumber || undefined,
      resultSummary: resultSummary || undefined,
      resultDocumentUrl: resultDocumentUrl || undefined,
      resultReceivedAt: resultReceivedAt
        ? new Date(resultReceivedAt).toISOString()
        : undefined,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await run({ successMessage: "Hasil laboratorium berhasil disimpan." });
  }

  const requiresLab = status !== "not_requested";
  const requiresResult = status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uji Sampel / Hasil Laboratorium</CardTitle>
      </CardHeader>
      <CardContent>
        {canEdit ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="lab-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="lab-status" className="mt-1.5 w-full">
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
            {requiresLab && (
              <div>
                <Label htmlFor="lab-name">Nama Laboratorium</Label>
                <Input
                  id="lab-name"
                  className="mt-1.5"
                  value={laboratoryName}
                  onChange={(event) => setLaboratoryName(event.target.value)}
                  required
                />
              </div>
            )}
            {requiresResult && (
              <>
                <div>
                  <Label htmlFor="lab-reference">Nomor Referensi</Label>
                  <Input
                    id="lab-reference"
                    className="mt-1.5"
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lab-summary">Ringkasan Hasil</Label>
                  <Textarea
                    id="lab-summary"
                    className="mt-1.5"
                    value={resultSummary}
                    onChange={(event) => setResultSummary(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lab-received">Tanggal Hasil Diterima</Label>
                  <Input
                    id="lab-received"
                    type="date"
                    className="mt-1.5"
                    value={resultReceivedAt}
                    onChange={(event) =>
                      setResultReceivedAt(event.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lab-document">
                    Tautan Dokumen (opsional)
                  </Label>
                  <Input
                    id="lab-document"
                    className="mt-1.5"
                    value={resultDocumentUrl}
                    onChange={(event) =>
                      setResultDocumentUrl(event.target.value)
                    }
                  />
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-sm text-text-secondary">
            {!sampleTesting || sampleTesting.status === "not_requested" ? (
              <p>Belum ada uji sampel yang diminta.</p>
            ) : (
              <p>
                Status: {sampleTesting.status}
                {sampleTesting.laboratoryName
                  ? ` · ${sampleTesting.laboratoryName}`
                  : ""}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
