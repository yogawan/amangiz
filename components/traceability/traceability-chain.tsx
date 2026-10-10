import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { RiskBadge, type RiskLevel } from "@/components/shared/risk-badge";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Ref {
  _id: string;
  code: string;
  name: string;
}

export interface TraceabilityChainData {
  batch: {
    _id: string;
    batchCode: string;
    menuName: string;
    productionDate: string;
    status: string;
  };
  sppg: Ref | null;
  suppliers: {
    supplier: Ref | null;
    ingredientName: string;
    quantity: number;
    unit: string;
  }[];
  distributions: {
    id: string;
    distributionCode: string;
    school: Ref | null;
    quantity: number;
    unit: string;
    status: string;
    scheduledAt?: string;
    dispatchedAt?: string;
    receivedAt?: string;
    receiptConfirmed: boolean;
    deliveryEvidence: { url: string; publicId: string }[];
  }[];
  relatedIncidents: {
    _id: string;
    incidentCode: string;
    title: string;
    status: string;
    severity: string;
    reportedAt: string;
    school: Ref | null;
  }[];
  summary: {
    totalDistributions: number;
    confirmedReceipts: number;
    pendingReceipts: number;
    schoolsReached: number;
    relatedIncidentCount: number;
  };
}

function formatDate(value?: string): string {
  return value
    ? new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" })
    : "—";
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
      <div className="mt-0.5 text-text-primary">{value}</div>
    </div>
  );
}

export function TraceabilityChain({ trace }: { trace: TraceabilityChainData }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Distribusi"
          value={trace.summary.totalDistributions}
        />
        <StatCard
          label="Terkonfirmasi Diterima"
          value={trace.summary.confirmedReceipts}
          tone="success"
        />
        <StatCard
          label="Belum Terkonfirmasi"
          value={trace.summary.pendingReceipts}
          tone="warning"
        />
        <StatCard
          label="Insiden Terkait"
          value={trace.summary.relatedIncidentCount}
          tone={trace.summary.relatedIncidentCount > 0 ? "danger" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Batch</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field
            label="Kode Batch"
            value={<span className="font-mono">{trace.batch.batchCode}</span>}
          />
          <Field label="Menu" value={trace.batch.menuName} />
          <Field
            label="Tanggal Produksi"
            value={formatDate(trace.batch.productionDate)}
          />
          <Field
            label="Status Batch"
            value={<StatusBadge status={trace.batch.status} />}
          />
          <Field
            label="SPPG"
            value={trace.sppg ? `${trace.sppg.code} — ${trace.sppg.name}` : "—"}
          />
        </CardContent>
        <CardContent className="border-t border-border pt-4">
          <Link
            href={`/app/batches/${trace.batch._id}`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Lihat detail batch →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pemasok &amp; Bahan Baku</CardTitle>
        </CardHeader>
        <CardContent>
          {trace.suppliers.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Belum ada bahan baku tercatat.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bahan</TableHead>
                  <TableHead>Pemasok</TableHead>
                  <TableHead>Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trace.suppliers.map((item) => (
                  <TableRow
                    key={`${item.supplier?._id ?? "x"}-${item.ingredientName}`}
                  >
                    <TableCell>{item.ingredientName}</TableCell>
                    <TableCell>
                      {item.supplier
                        ? `${item.supplier.code} — ${item.supplier.name}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jalur Distribusi ({trace.distributions.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-text-muted">
            Status di bawah hanya mencerminkan data yang benar-benar tercatat —
            leg tanpa waktu penerimaan ditandai "Belum Dikonfirmasi", bukan
            seolah sudah diterima.
          </p>
          {trace.distributions.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Batch ini belum didistribusikan.
            </p>
          ) : (
            trace.distributions.map((leg) => (
              <div key={leg.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-text-secondary">
                      {leg.distributionCode}
                    </p>
                    <p className="font-medium text-text-primary">
                      {leg.school
                        ? `${leg.school.code} — ${leg.school.name}`
                        : "Sekolah tidak diketahui"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={leg.status} />
                    <StatusBadge
                      status={leg.receiptConfirmed ? "delivered" : "pending"}
                      label={
                        leg.receiptConfirmed
                          ? "Diterima — Terkonfirmasi"
                          : "Belum Dikonfirmasi"
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary sm:grid-cols-4">
                  <span>
                    Jumlah: {leg.quantity} {leg.unit}
                  </span>
                  <span>Jadwal: {formatDate(leg.scheduledAt)}</span>
                  <span>
                    Berangkat:{" "}
                    {leg.dispatchedAt
                      ? formatDate(leg.dispatchedAt)
                      : "Belum berangkat"}
                  </span>
                  <span>
                    Diterima:{" "}
                    {leg.receivedAt
                      ? formatDate(leg.receivedAt)
                      : "Belum diterima"}
                  </span>
                </div>
                {leg.deliveryEvidence.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {leg.deliveryEvidence.map((evidence) => (
                      <a
                        key={evidence.publicId}
                        href={evidence.url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block h-14 w-14 overflow-hidden rounded-md border border-border"
                      >
                        <Image
                          src={evidence.url}
                          alt="Bukti pengiriman"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
                <Link
                  href={`/app/distribution/${leg.id}`}
                  className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  Lihat detail distribusi →
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insiden Terkait</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {trace.relatedIncidents.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Tidak ada insiden yang terkait dengan batch ini.
            </p>
          ) : (
            trace.relatedIncidents.map((incident) => (
              <div
                key={incident._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-mono text-xs text-text-secondary">
                    {incident.incidentCode}
                  </p>
                  <p className="font-medium text-text-primary">
                    {incident.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {incident.school
                      ? `${incident.school.code} — ${incident.school.name}`
                      : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {incident.severity === "unassessed" ? (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-text-secondary">
                      Belum Dinilai
                    </span>
                  ) : (
                    <RiskBadge level={incident.severity as RiskLevel} />
                  )}
                  <StatusBadge status={incident.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
