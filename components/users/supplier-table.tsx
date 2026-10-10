"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { SupplierFormDialog } from "./supplier-form-dialog";
import { SupplierVerificationDialog } from "./supplier-verification-dialog";

export interface SupplierRow {
  _id: string;
  code: string;
  name: string;
  supplierType: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  status: "active" | "inactive";
}

export function SupplierTable({ initialData }: { initialData: SupplierRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [verifying, setVerifying] = useState<SupplierRow | null>(null);

  const columns: DataTableColumn<SupplierRow>[] = [
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
      key: "supplierType",
      header: "Jenis",
      render: (row) => row.supplierType,
      sortValue: (row) => row.supplierType,
    },
    {
      key: "verificationStatus",
      header: "Verifikasi",
      render: (row) => <StatusBadge status={row.verificationStatus} />,
      sortValue: (row) => row.verificationStatus,
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
          <Button variant="outline" size="sm" onClick={() => setVerifying(row)}>
            Verifikasi
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
        searchKeys={(row) => [row.code, row.name]}
        searchPlaceholder="Cari kode atau nama..."
        emptyTitle="Belum ada pemasok"
        headerAction={
          <Button size="sm" onClick={() => setCreating(true)}>
            Tambah Pemasok
          </Button>
        }
      />
      <SupplierFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
      />
      <SupplierFormDialog
        mode="edit"
        supplier={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <SupplierVerificationDialog
        supplier={verifying}
        open={Boolean(verifying)}
        onOpenChange={(open) => !open && setVerifying(null)}
      />
    </>
  );
}
