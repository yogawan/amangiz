"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { RiskBadge, type RiskLevel } from "@/components/shared/risk-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export interface IncidentRow {
  _id: string;
  incidentCode: string;
  title: string;
  incidentType: string;
  severity: string;
  status: string;
  reportedAt: string;
  reportedAffectedCount?: number;
  batch: { batchCode: string } | null;
  school: { code: string; name: string } | null;
}

export function IncidentsTable({
  initialData,
}: {
  initialData: IncidentRow[];
}) {
  const columns: DataTableColumn<IncidentRow>[] = [
    {
      key: "incidentCode",
      header: "Kode",
      render: (row) => (
        <Link
          href={`/app/incidents/${row._id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.incidentCode}
        </Link>
      ),
      sortValue: (row) => row.incidentCode,
    },
    {
      key: "title",
      header: "Judul",
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.title}</p>
          <p className="text-xs text-text-secondary">
            {row.batch?.batchCode ?? row.school?.name ?? "—"}
          </p>
        </div>
      ),
      sortValue: (row) => row.title,
    },
    {
      key: "severity",
      header: "Severity",
      render: (row) =>
        row.severity === "unassessed" ? (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-text-secondary">
            Belum Dinilai
          </span>
        ) : (
          <RiskBadge level={row.severity as RiskLevel} />
        ),
      sortValue: (row) => row.severity,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      key: "reportedAt",
      header: "Dilaporkan",
      render: (row) =>
        new Date(row.reportedAt).toLocaleDateString("id-ID", {
          dateStyle: "medium",
        }),
      sortValue: (row) => row.reportedAt,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={initialData}
      rowKey={(row) => row._id}
      emptyTitle="Belum ada insiden"
      emptyDescription="Laporan insiden yang dibuat akan muncul di sini."
      headerAction={
        <Button asChild size="sm">
          <Link href="/app/incidents/new">Lapor Insiden</Link>
        </Button>
      }
    />
  );
}
