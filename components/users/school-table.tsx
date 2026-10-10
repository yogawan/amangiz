"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { apiPatch } from "@/lib/api/client";
import { useMutation } from "@/lib/api/use-mutation";
import { SchoolFormDialog } from "./school-form-dialog";

export interface SchoolRow {
  _id: string;
  code: string;
  name: string;
  level?: string;
  address: {
    street: string;
    village?: string;
    district?: string;
    city: string;
    province: string;
  };
  contactName?: string;
  contactPhone?: string;
  recipientCapacity?: number;
  status: "active" | "inactive";
}

export function SchoolTable({ initialData }: { initialData: SchoolRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SchoolRow | null>(null);
  const [toggling, setToggling] = useState<SchoolRow | null>(null);

  const { run, loading } = useMutation(async () => {
    if (!toggling) return;
    await apiPatch(`/api/v1/schools/${toggling._id}`, {
      status: toggling.status === "active" ? "inactive" : "active",
    });
  });

  const columns: DataTableColumn<SchoolRow>[] = [
    {
      key: "code",
      header: "Kode",
      render: (row) => <span className="font-mono text-xs">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      key: "name",
      header: "Nama",
      render: (row) => row.name,
      sortValue: (row) => row.name,
    },
    {
      key: "level",
      header: "Jenjang",
      render: (row) => row.level ?? "—",
      sortValue: (row) => row.level ?? "",
    },
    {
      key: "city",
      header: "Kota",
      render: (row) => `${row.address.city}, ${row.address.province}`,
      sortValue: (row) => row.address.city,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
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
            {row.status === "active" ? "Nonaktifkan" : "Aktifkan"}
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
        searchKeys={(row) => [row.code, row.name, row.address.city]}
        searchPlaceholder="Cari kode, nama, atau kota..."
        emptyTitle="Belum ada sekolah"
        headerAction={
          <Button size="sm" onClick={() => setCreating(true)}>
            Tambah Sekolah
          </Button>
        }
      />
      <SchoolFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
      />
      <SchoolFormDialog
        mode="edit"
        school={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(open) => !open && setToggling(null)}
        title={
          toggling?.status === "active"
            ? "Nonaktifkan sekolah?"
            : "Aktifkan sekolah?"
        }
        description={
          toggling ? `${toggling.name} (${toggling.code})` : undefined
        }
        destructive={toggling?.status === "active"}
        confirmLabel={loading ? "Memproses..." : "Konfirmasi"}
        onConfirm={async () => {
          await run({ successMessage: "Status sekolah diperbarui." });
          setToggling(null);
        }}
      />
    </>
  );
}
