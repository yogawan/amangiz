"use client";

import { type FormEvent, useState } from "react";
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
import { apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"] as const;

/**
 * Human triage (PRD §6.4 #4): sets `Incident.severity`, kept deliberately
 * separate from the rule-based risk engine's own score/level.
 */
export function TriageDialog({
  incidentId,
  incidentCode,
  open,
  onOpenChange,
}: {
  incidentId: string;
  incidentCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [severity, setSeverity] = useState<string>("medium");
  const [note, setNote] = useState("");

  const { run, loading, error, setError } = useMutation(async () => {
    return apiPost(`/api/v1/incidents/${incidentId}/triage`, {
      severity,
      note,
    });
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (note.trim().length < 5) {
      setError("Catatan triage wajib diisi (minimal 5 karakter).");
      return;
    }
    const result = await run({
      successMessage: `Insiden ${incidentCode} berhasil ditriase.`,
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Triage Insiden</DialogTitle>
          <DialogDescription>{incidentCode}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="triage-severity">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="triage-severity" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="triage-note">Catatan Triage</Label>
            <Textarea
              id="triage-note"
              className="mt-1.5"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Dasar penentuan severity ini"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
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
              {loading ? "Menyimpan..." : "Simpan Triage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
