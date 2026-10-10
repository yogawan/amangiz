"use client";

import { useState } from "react";
import { ROLE_LABELS } from "@/components/layout/nav-items";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { apiPatch } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";
import type { UserRole } from "@/models/User";
import { UserFormDialog } from "./user-form-dialog";

export interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationType: "system" | "sppg" | "school" | "health_authority";
  organizationId?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export function UsersTable({ initialData }: { initialData: UserRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [toggling, setToggling] = useState<UserRow | null>(null);

  const { run, loading } = useMutation(async () => {
    if (!toggling) return;
    await apiPatch(`/api/v1/users/${toggling._id}/status`, {
      isActive: !toggling.isActive,
    });
  });

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "name",
      header: "Nama",
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-xs text-text-secondary">{row.email}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "role",
      header: "Role",
      render: (row) => ROLE_LABELS[row.role],
      sortValue: (row) => row.role,
    },
    {
      key: "organizationType",
      header: "Organisasi",
      render: (row) => row.organizationType,
      sortValue: (row) => row.organizationType,
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <StatusBadge status={row.isActive ? "active" : "inactive"} />
      ),
      sortValue: (row) => (row.isActive ? 1 : 0),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setToggling(row)}>
            {row.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={initialData}
        rowKey={(row) => row._id}
        searchKeys={(row) => [row.name, row.email]}
        searchPlaceholder="Cari nama atau email..."
        emptyTitle="Belum ada pengguna"
        headerAction={
          <Button size="sm" onClick={() => setCreating(true)}>
            Tambah Pengguna
          </Button>
        }
      />
      <UserFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
      />
      <UserFormDialog
        mode="edit"
        user={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(open) => !open && setToggling(null)}
        title={
          toggling?.isActive ? "Nonaktifkan pengguna?" : "Aktifkan pengguna?"
        }
        description={
          toggling
            ? `${toggling.name} (${toggling.email}) akan di-${toggling.isActive ? "nonaktifkan" : "aktifkan"}.`
            : undefined
        }
        destructive={Boolean(toggling?.isActive)}
        confirmLabel={loading ? "Memproses..." : "Konfirmasi"}
        onConfirm={async () => {
          await run({ successMessage: "Status pengguna diperbarui." });
          setToggling(null);
        }}
      />
    </>
  );
}
