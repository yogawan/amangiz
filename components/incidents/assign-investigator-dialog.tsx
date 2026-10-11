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

/**
 * Admins get the full picker; `/api/v1/users` is admin-only (PRD §8.4), so an
 * investigator acting on their own behalf gets a simpler "assign to me"
 * confirmation instead of a picker they can't actually populate.
 */
export function AssignInvestigatorDialog({
  incidentId,
  incidentCode,
  mode,
  selfId,
  open,
  onOpenChange,
}: {
  incidentId: string;
  incidentCode: string;
  mode: "admin" | "self";
  selfId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [investigatorId, setInvestigatorId] = useState("");
  const [note, setNote] = useState("");
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    if (!open || mode !== "admin") return;
    Promise.all([
      apiGet<{ _id: string; name: string; email: string }[]>(
        "/api/v1/users?role=investigator&limit=100",
      ),
      apiGet<{ _id: string; name: string; email: string }[]>(
        "/api/v1/users?role=admin&limit=100",
      ),
    ])
      .then(([investigators, admins]) =>
        setOptions(
          [...investigators.data, ...admins.data].map((user) => ({
            value: user._id,
            label: `${user.name} (${user.email})`,
          })),
        ),
      )
      .catch(() => setOptions([]));
  }, [open, mode]);

  const { run, loading, error, setError } = useMutation(async () => {
    const assignTo = mode === "self" ? selfId : investigatorId;
    return apiPost(`/api/v1/incidents/${incidentId}/assign`, {
      investigatorId: assignTo,
      note: note || undefined,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "admin" && !investigatorId) {
      setError("Pilih investigator terlebih dahulu.");
      return;
    }
    const result = await run({
      successMessage: `Investigator untuk ${incidentCode} berhasil ditugaskan.`,
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "self" ? "Tugaskan ke Saya" : "Tugaskan Investigator"}
          </DialogTitle>
          <DialogDescription>{incidentCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "admin" && (
            <div>
              <Label htmlFor="assign-investigator">Investigator</Label>
              <Select value={investigatorId} onValueChange={setInvestigatorId}>
                <SelectTrigger
                  id="assign-investigator"
                  className="mt-1.5 w-full"
                >
                  <SelectValue placeholder="Pilih investigator" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="assign-note">Catatan (opsional)</Label>
            <Textarea
              id="assign-note"
              className="mt-1.5"
              value={note}
              onChange={(event) => setNote(event.target.value)}
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
              {loading ? "Menyimpan..." : "Tugaskan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
