"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export interface BatchRow {
  _id: string;
  batchCode: string;
  menuName: string;
  productionDate: string;
  status: string;
  sppg: { _id: string; code: string; name: string } | null;
}

export function BatchesTable({
  initialData,
  canCreate,
}: {
  initialData: BatchRow[];
  canCreate: boolean;
}) {
  const columns: DataTableColumn<BatchRow>[] = [
    {
      key: "batchCode",
      header: "Kode Batch",
      render: (row) => (
        <Link
          href={`/app/batches/${row._id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.batchCode}
        </Link>
      ),
      sortValue: (row) => row.batchCode,
    },
    {
      key: "menuName",
      header: "Menu",
      render: (row) => row.menuName,
      sortValue: (row) => row.menuName,
    },
    {
      key: "sppg",
      header: "SPPG",
      render: (row) => row.sppg?.name ?? "—",
      sortValue: (row) => row.sppg?.name ?? "",
    },
    {
      key: "productionDate",
      header: "Tanggal Produksi",
      render: (row) =>
        new Date(row.productionDate).toLocaleDateString("id-ID", {
          dateStyle: "medium",
        }),
      sortValue: (row) => row.productionDate,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={initialData}
      rowKey={(row) => row._id}
      emptyTitle="Belum ada batch"
      emptyDescription="Batch yang dibuat akan muncul di sini."
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link href="/app/batches/new">Tambah Batch</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
