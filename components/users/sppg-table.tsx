"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { SppgFormDialog } from "./sppg-form-dialog";
import { SppgStatusDialog } from "./sppg-status-dialog";

export interface SppgRow {
  _id: string;
  code: string;
  name: string;
  address: {
    street: string;
    village?: string;
    district?: string;
    city: string;
    province: string;
    postalCode?: string;
  };
  contactName?: string;
  contactPhone?: string;
  status: "active" | "suspended" | "inactive";
}

export function SppgTable({ initialData }: { initialData: SppgRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SppgRow | null>(null);
  const [changingStatus, setChangingStatus] = useState<SppgRow | null>(null);

  const columns: DataTableColumn<SppgRow>[] = [
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChangingStatus(row)}
          >
            Status
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
        emptyTitle="Belum ada SPPG"
        headerAction={
          <Button size="sm" onClick={() => setCreating(true)}>
            Tambah SPPG
          </Button>
        }
      />
      <SppgFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
      />
      <SppgFormDialog
        mode="edit"
        sppg={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <SppgStatusDialog
        sppg={changingStatus}
        open={Boolean(changingStatus)}
        onOpenChange={(open) => !open && setChangingStatus(null)}
      />
    </>
  );
}
