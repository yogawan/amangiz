"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { ApiClientError, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

export interface CorrectiveActionData {
  _id: string;
  action: string;
  owner: { name: string; email: string } | null;
  ownerId: string;
  dueAt?: string;
  status: string;
  completedAt?: string;
  canUpdateStatus: boolean;
}

const STATUS_OPTIONS = ["pending", "in_progress", "completed"];

/**
 * Create picker: admins get the full user list; `/api/v1/users` is
 * admin-only (PRD §8.4), so the assigned investigator (the only other role
 * that can reach this form) assigns to themselves instead of a broken picker.
 */
export function CorrectiveActionsSection({
  investigationId,
  actions,
  canCreate,
  isAdmin,
  selfId,
  selfName,
}: {
  investigationId: string;
  actions: CorrectiveActionData[];
  canCreate: boolean;
  isAdmin: boolean;
  selfId: string;
  selfName: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState("");
  const [ownerId, setOwnerId] = useState(isAdmin ? "" : selfId);
  const [dueAt, setDueAt] = useState("");
  const [ownerOptions, setOwnerOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    if (!adding || !isAdmin) return;
    apiGet<{ _id: string; name: string; email: string }[]>(
      "/api/v1/users?limit=100",
    )
      .then(({ data }) =>
        setOwnerOptions(
          data.map((user) => ({
            value: user._id,
            label: `${user.name} (${user.email})`,
          })),
        ),
      )
      .catch(() => setOwnerOptions([]));
  }, [adding, isAdmin]);

  const { run, loading, error, setError } = useMutation(async () => {
    return apiPost(
      `/api/v1/investigations/${investigationId}/corrective-actions`,
      {
        action,
        ownerId,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      },
    );
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ownerId) {
      setError("Pilih pemilik tindakan terlebih dahulu.");
      return;
    }
    const result = await run({
      successMessage: "Tindakan korektif berhasil dibuat.",
    });
    if (result) {
      setAdding(false);
      setAction("");
      setOwnerId(isAdmin ? "" : selfId);
      setDueAt("");
    }
  }

  async function updateStatus(actionId: string, status: string) {
    try {
      await apiPatch(
        `/api/v1/investigations/${investigationId}/corrective-actions/${actionId}`,
        { status },
      );
      toast.success("Status tindakan diperbarui.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Gagal memperbarui status.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tindakan Korektif</CardTitle>
          {canCreate && (
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
              <Label htmlFor="action-text">Tindakan</Label>
              <Input
                id="action-text"
                className="mt-1.5"
                value={action}
                onChange={(event) => setAction(event.target.value)}
                required
                minLength={5}
              />
            </div>
            {isAdmin ? (
              <div>
                <Label htmlFor="action-owner">Pemilik</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger id="action-owner" className="mt-1.5 w-full">
                    <SelectValue placeholder="Pilih pemilik" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                Pemilik: {selfName} (ditugaskan ke diri sendiri)
              </p>
            )}
            <div>
              <Label htmlFor="action-due">Tenggat (opsional)</Label>
              <Input
                id="action-due"
                type="date"
                className="mt-1.5"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
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
        {actions.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Belum ada tindakan korektif.
          </p>
        ) : (
          actions.map((item) => (
            <div
              key={item._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {item.action}
                </p>
                <p className="text-xs text-text-secondary">
                  {item.owner?.name ?? "—"}
                  {item.dueAt
                    ? ` · Tenggat ${new Date(item.dueAt).toLocaleDateString("id-ID")}`
                    : ""}
                </p>
              </div>
              <Select
                value={item.status}
                onValueChange={(value) => updateStatus(item._id, value)}
                disabled={!item.canUpdateStatus}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
