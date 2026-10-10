"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export interface DistributionRow {
  _id: string;
  distributionCode: string;
  batch: { _id: string; batchCode: string; menuName: string } | null;
  school: { _id: string; code: string; name: string } | null;
  quantity: number;
  unit: string;
  scheduledAt?: string;
  status: string;
}

export function DistributionsTable({
  initialData,
  canCreate,
}: {
  initialData: DistributionRow[];
  canCreate: boolean;
}) {
  const columns: DataTableColumn<DistributionRow>[] = [
    {
      key: "distributionCode",
      header: "Kode",
      render: (row) => (
        <Link
          href={`/app/distribution/${row._id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.distributionCode}
        </Link>
      ),
      sortValue: (row) => row.distributionCode,
    },
    {
      key: "batch",
      header: "Batch",
      render: (row) => row.batch?.menuName ?? "—",
      sortValue: (row) => row.batch?.menuName ?? "",
    },
    {
      key: "school",
      header: "Sekolah",
      render: (row) => row.school?.name ?? "—",
      sortValue: (row) => row.school?.name ?? "",
    },
    {
      key: "quantity",
      header: "Jumlah",
      render: (row) => `${row.quantity} ${row.unit}`,
      sortValue: (row) => row.quantity,
    },
    {
      key: "scheduledAt",
      header: "Jadwal",
      render: (row) =>
        row.scheduledAt
          ? new Date(row.scheduledAt).toLocaleDateString("id-ID", {
              dateStyle: "medium",
            })
          : "—",
      sortValue: (row) => row.scheduledAt ?? "",
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
      emptyTitle="Belum ada distribusi"
      emptyDescription="Pengiriman yang dibuat akan muncul di sini."
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link href="/app/distribution/new">Tambah Distribusi</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
