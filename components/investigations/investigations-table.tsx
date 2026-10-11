"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";

export interface InvestigationRow {
  _id: string;
  status: string;
  rootCauseStatus: string;
  createdAt: string;
  incident: { incidentCode: string; title: string; status: string } | null;
  assignedTo: { name: string } | null;
}

export function InvestigationsTable({
  initialData,
}: {
  initialData: InvestigationRow[];
}) {
  const columns: DataTableColumn<InvestigationRow>[] = [
    {
      key: "incident",
      header: "Insiden",
      render: (row) => (
        <Link
          href={`/app/investigations/${row._id}`}
          className="block hover:underline"
        >
          <p className="font-mono text-xs text-muted">
            {row.incident?.incidentCode ?? "—"}
          </p>
          <p className="font-medium text-foreground">
            {row.incident?.title ?? "—"}
          </p>
        </Link>
      ),
      sortValue: (row) => row.incident?.title ?? "",
    },
    {
      key: "assignedTo",
      header: "Investigator",
      render: (row) => row.assignedTo?.name ?? "—",
      sortValue: (row) => row.assignedTo?.name ?? "",
    },
    {
      key: "status",
      header: "Status Investigasi",
      render: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      key: "rootCauseStatus",
      header: "Akar Masalah",
      render: (row) => <StatusBadge status={row.rootCauseStatus} />,
      sortValue: (row) => row.rootCauseStatus,
    },
    {
      key: "createdAt",
      header: "Dibuka",
      render: (row) =>
        new Date(row.createdAt).toLocaleDateString("id-ID", {
          dateStyle: "medium",
        }),
      sortValue: (row) => row.createdAt,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={initialData}
      rowKey={(row) => row._id}
      emptyTitle="Belum ada investigasi"
      emptyDescription="Investigasi akan muncul setelah investigator ditugaskan pada sebuah insiden."
    />
  );
}
