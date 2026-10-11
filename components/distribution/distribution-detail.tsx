"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DispatchDialog } from "./dispatch-dialog";
import { EvidenceUpload } from "./evidence-upload";
import { ReceiveDialog } from "./receive-dialog";

export interface DistributionDetailData {
  _id: string;
  distributionCode: string;
  status: string;
  quantity: number;
  unit: string;
  scheduledAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  dispatchTemperature?: number;
  receivedTemperature?: number;
  notes?: string;
  batch: { _id: string; batchCode: string; menuName: string } | null;
  school: { _id: string; code: string; name: string } | null;
  sppg: { _id: string; code: string; name: string } | null;
  deliveryEvidence: { url: string; publicId: string; uploadedAt: string }[];
}

export interface DistributionTimelineEntry {
  at: string;
  event: string;
  label: string;
}

function formatDate(value?: string): string {
  return value
    ? new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" })
    : "—";
}

function formatDateTime(value?: string): string {
  return value ? new Date(value).toLocaleString("id-ID") : "Belum tercatat";
}

export function DistributionDetail({
  distribution,
  timeline,
  permissions,
}: {
  distribution: DistributionDetailData;
  timeline: DistributionTimelineEntry[];
  permissions: {
    canDispatch: boolean;
    canReceive: boolean;
    canUploadEvidence: boolean;
  };
}) {
  const [dialog, setDialog] = useState<"dispatch" | "receive" | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted">
            {distribution.distributionCode}
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            {distribution.batch?.menuName ?? "Distribusi"}
          </h1>
          <div className="mt-2">
            <StatusBadge status={distribution.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {distribution.batch && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/app/traceability?code=${encodeURIComponent(distribution.batch.batchCode)}`}
              >
                Lihat Traceability
              </Link>
            </Button>
          )}
          {permissions.canDispatch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog("dispatch")}
            >
              Catat Keberangkatan
            </Button>
          )}
          {permissions.canReceive && (
            <Button size="sm" onClick={() => setDialog("receive")}>
              Konfirmasi Penerimaan
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Pengiriman</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field
            label="Batch"
            value={
              distribution.batch
                ? `${distribution.batch.batchCode} — ${distribution.batch.menuName}`
                : "—"
            }
          />
          <Field
            label="Sekolah Tujuan"
            value={
              distribution.school
                ? `${distribution.school.code} — ${distribution.school.name}`
                : "—"
            }
          />
          <Field
            label="SPPG Pengirim"
            value={
              distribution.sppg
                ? `${distribution.sppg.code} — ${distribution.sppg.name}`
                : "—"
            }
          />
          <Field
            label="Jumlah"
            value={`${distribution.quantity} ${distribution.unit}`}
          />
          <Field label="Jadwal" value={formatDate(distribution.scheduledAt)} />
          <Field
            label="Keberangkatan"
            value={formatDateTime(distribution.dispatchedAt)}
          />
          <Field
            label="Penerimaan"
            value={formatDateTime(distribution.receivedAt)}
          />
          {distribution.dispatchTemperature !== undefined && (
            <Field
              label="Suhu Keberangkatan"
              value={`${distribution.dispatchTemperature}°C`}
            />
          )}
          {distribution.receivedTemperature !== undefined && (
            <Field
              label="Suhu Penerimaan"
              value={`${distribution.receivedTemperature}°C`}
            />
          )}
        </CardContent>
        {distribution.notes && (
          <CardContent className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted">Catatan</p>
            <p className="mt-1 text-sm text-foreground">{distribution.notes}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengiriman</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">Belum ada riwayat.</p>
          ) : (
            timeline.map((entry) => (
              <div
                key={`${entry.event}-${entry.at}`}
                className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.label}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(entry.at).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bukti Pengiriman</CardTitle>
            {permissions.canUploadEvidence && (
              <EvidenceUpload distributionId={distribution._id} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {distribution.deliveryEvidence.length === 0 ? (
            <p className="text-sm text-muted">Belum ada bukti diunggah.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {distribution.deliveryEvidence.map((evidence) => (
                <a
                  key={evidence.publicId}
                  href={evidence.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block h-28 overflow-hidden rounded-lg border border-border"
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
        </CardContent>
      </Card>

      <DispatchDialog
        distributionId={distribution._id}
        distributionCode={distribution.distributionCode}
        open={dialog === "dispatch"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <ReceiveDialog
        distributionId={distribution._id}
        distributionCode={distribution.distributionCode}
        open={dialog === "receive"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  );
}
