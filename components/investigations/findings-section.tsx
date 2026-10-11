"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

export interface FindingData {
  title: string;
  description: string;
  evidenceUrls: string[];
}

/** PRD §6.4 #4: findings are evidence-backed observations, kept distinct from the initial report and the risk score. */
export function FindingsSection({
  investigationId,
  findings,
  canEdit,
}: {
  investigationId: string;
  findings: FindingData[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    const urls = evidenceUrls
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return apiPost(`/api/v1/investigations/${investigationId}/findings`, {
      title,
      description,
      evidenceUrls: urls,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage: "Temuan berhasil ditambahkan.",
    });
    if (result) {
      setAdding(false);
      setTitle("");
      setDescription("");
      setEvidenceUrls("");
      setError(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Temuan Investigasi</CardTitle>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding((v) => !v)}
            >
              {adding ? "Batal" : "+ Tambah"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {adding && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-lg border border-border p-3"
          >
            <div>
              <Label htmlFor="finding-title">Judul Temuan</Label>
              <Input
                id="finding-title"
                className="mt-1.5"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
              />
            </div>
            <div>
              <Label htmlFor="finding-description">Deskripsi</Label>
              <Textarea
                id="finding-description"
                className="mt-1.5"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={10}
              />
            </div>
            <div>
              <Label htmlFor="finding-evidence">Tautan Bukti (opsional)</Label>
              <Input
                id="finding-evidence"
                className="mt-1.5"
                value={evidenceUrls}
                onChange={(event) => setEvidenceUrls(event.target.value)}
                placeholder="Pisahkan dengan koma"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        )}
        {findings.length === 0 ? (
          <p className="text-sm text-muted">Belum ada temuan tercatat.</p>
        ) : (
          findings.map((finding) => (
            <div
              key={finding.title}
              className="rounded-lg border border-border p-3"
            >
              <p className="text-sm font-medium text-foreground">
                {finding.title}
              </p>
              <p className="mt-1 text-sm text-muted">{finding.description}</p>
              {finding.evidenceUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {finding.evidenceUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Bukti →
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
