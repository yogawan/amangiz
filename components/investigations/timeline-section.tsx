"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

export interface TimelineEntryData {
  occurredAt: string;
  action: string;
  description: string;
  actor: { name: string } | null;
}

export function TimelineSection({
  investigationId,
  entries,
  canEdit,
}: {
  investigationId: string;
  entries: TimelineEntryData[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [occurredAt, setOccurredAt] = useState("");
  const [action, setAction] = useState("");
  const [description, setDescription] = useState("");

  const { run, loading, error } = useMutation(async () => {
    return apiPost(`/api/v1/investigations/${investigationId}/timeline`, {
      // <input type="datetime-local"> has no timezone/seconds; the server's
      // isoDateSchema needs a full ISO 8601 string.
      occurredAt: new Date(occurredAt).toISOString(),
      action,
      description,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage: "Kronologi berhasil ditambahkan.",
    });
    if (result) {
      setAdding(false);
      setOccurredAt("");
      setAction("");
      setDescription("");
    }
  }

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Kronologi</CardTitle>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="timeline-occurred">Waktu</Label>
                <Input
                  id="timeline-occurred"
                  type="datetime-local"
                  className="mt-1.5"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="timeline-action">Tindakan</Label>
                <Input
                  id="timeline-action"
                  className="mt-1.5"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  required
                  minLength={3}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="timeline-description">Deskripsi</Label>
              <Textarea
                id="timeline-description"
                className="mt-1.5"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={5}
              />
            </div>
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
        )}
        {sorted.length === 0 ? (
          <p className="text-sm text-text-secondary">Belum ada kronologi.</p>
        ) : (
          sorted.map((entry) => (
            <div
              key={`${entry.occurredAt}-${entry.action}`}
              className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {entry.action}
                </p>
                <p className="text-xs text-text-secondary">
                  {entry.description}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(entry.occurredAt).toLocaleString("id-ID")}
                  {entry.actor ? ` · ${entry.actor.name}` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
