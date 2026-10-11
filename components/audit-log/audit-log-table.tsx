"use client";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";

export interface AuditLogRow {
  _id: string;
  actorName: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  changeCount: number;
  createdAt: string;
}

export function AuditLogTable({ data }: { data: AuditLogRow[] }) {
  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      key: "createdAt",
      header: "Waktu",
      render: (row) =>
        new Date(row.createdAt).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      sortValue: (row) => row.createdAt,
    },
    {
      key: "actor",
      header: "Aktor",
      render: (row) => row.actorName ?? "Sistem",
      sortValue: (row) => row.actorName ?? "",
    },
    {
      key: "action",
      header: "Aksi",
      render: (row) => (
        <span className="font-mono text-xs text-muted">{row.action}</span>
      ),
      sortValue: (row) => row.action,
    },
    {
      key: "resource",
      header: "Resource",
      render: (row) => (
        <span className="font-mono text-xs text-muted">
          {row.resourceType} · {row.resourceId}
        </span>
      ),
      sortValue: (row) => row.resourceType,
    },
    {
      key: "changes",
      header: "Perubahan",
      render: (row) => (row.changeCount > 0 ? `${row.changeCount} field` : "—"),
      sortValue: (row) => row.changeCount,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(row) => row._id}
      pageSize={20}
      emptyTitle="Belum ada aktivitas"
      emptyDescription="Aktivitas yang sesuai filter akan muncul di sini."
    />
  );
}
