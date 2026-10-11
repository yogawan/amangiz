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
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";
import type { UserRow } from "./users-table";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "sppg_operator", label: "Operator SPPG" },
  { value: "school_operator", label: "Operator Sekolah" },
  { value: "investigator", label: "Investigator" },
] as const;

type Role = (typeof ROLE_OPTIONS)[number]["value"];

const ORG_TYPE_BY_ROLE: Record<
  Role,
  "system" | "sppg" | "school" | "health_authority"
> = {
  admin: "system",
  sppg_operator: "sppg",
  school_operator: "school",
  investigator: "health_authority",
};

interface OrgOption {
  value: string;
  label: string;
}

export function UserFormDialog({
  mode,
  user,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  user?: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("sppg_operator");
  const [organizationId, setOrganizationId] = useState("");
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);

  // Payloads are sent as-is and validated server-side (createUserSchema /
  // updateUserSchema): those schemas live in lib/validations/user.ts, which
  // imports lib/validations/common.ts -> mongoose, and mongoose can't be
  // bundled into a client component (pulls in Node-only `tls`,
  // `timers/promises`, etc.) — see memory amangiz-client-validation-bundling.
  const { run, loading, error, setError } = useMutation(async () => {
    if (mode === "create") {
      const payload = {
        name,
        email,
        password,
        role,
        organizationType: ORG_TYPE_BY_ROLE[role],
        organizationId: organizationId || undefined,
        isActive: true,
      };
      return apiPost("/api/v1/users", payload);
    }
    if (!user) throw new Error("No user selected");
    const payload = {
      name,
      email,
      role,
      organizationType: ORG_TYPE_BY_ROLE[role],
      organizationId: organizationId || undefined,
    };
    return apiPatch(`/api/v1/users/${user._id}`, payload);
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setOrganizationId(user.organizationId ?? "");
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setRole("sppg_operator");
      setOrganizationId("");
    }
  }, [open, mode, user, setError]);

  const needsOrganization =
    role === "sppg_operator" || role === "school_operator";

  useEffect(() => {
    if (!open || !needsOrganization) return;
    const endpoint =
      role === "sppg_operator" ? "/api/v1/sppgs" : "/api/v1/schools";
    apiGet<{ _id: string; code: string; name: string }[]>(
      `${endpoint}?limit=100`,
    )
      .then(({ data }) =>
        setOrgOptions(
          data.map((item) => ({
            value: item._id,
            label: `${item.code} — ${item.name}`,
          })),
        ),
      )
      .catch(() => setOrgOptions([]));
  }, [open, needsOrganization, role]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await run({
      successMessage:
        mode === "create"
          ? "Pengguna berhasil dibuat."
          : "Pengguna berhasil diperbarui.",
    });
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Pengguna" : "Edit Pengguna"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Buat akun baru untuk admin, operator, atau investigator."
              : "Perbarui data pengguna."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="user-name">Nama</Label>
            <Input
              id="user-name"
              className="mt-1.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              className="mt-1.5"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          {mode === "create" && (
            <div>
              <Label htmlFor="user-password">Password</Label>
              <Input
                id="user-password"
                type="password"
                className="mt-1.5"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                required
              />
              <p className="mt-1 text-xs text-muted">Minimal 12 karakter.</p>
            </div>
          )}
          <div>
            <Label htmlFor="user-role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
            >
              <SelectTrigger id="user-role" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsOrganization && (
            <div>
              <Label htmlFor="user-org">
                {role === "sppg_operator" ? "SPPG" : "Sekolah"}
              </Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger id="user-org" className="mt-1.5 w-full">
                  <SelectValue placeholder="Pilih salah satu" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
