"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BatchContainmentDialog } from "./batch-containment-dialog";

export interface BatchDetailData {
  _id: string;
  batchCode: string;
  menuName: string;
  productionDate: string;
  expiryAt?: string;
  productionNotes?: string;
  status: string;
  sppg: { _id: string; code: string; name: string } | null;
  ingredients: {
    ingredientName: string;
    quantity: number;
    unit: string;
    supplierBatchCode?: string;
    supplier: { _id: string; code: string; name: string } | null;
  }[];
  storageTemperature: { value: number; recordedAt: string }[];
  createdBy: { name: string; email: string } | null;
  updatedBy: { name: string; email: string } | null;
}

export function BatchDetail({
  batch,
  permissions,
}: {
  batch: BatchDetailData;
  permissions: {
    canEdit: boolean;
    canHold: boolean;
    canRelease: boolean;
    canRecall: boolean;
  };
}) {
  const [action, setAction] = useState<"hold" | "release" | "recall" | null>(
    null,
  );

  const showHold =
    permissions.canHold &&
    batch.status !== "on_hold" &&
    batch.status !== "recalled";
  const showRelease = permissions.canRelease && batch.status === "on_hold";
  const showRecall = permissions.canRecall && batch.status !== "recalled";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted">{batch.batchCode}</p>
          <h1 className="text-xl font-semibold text-foreground">
            {batch.menuName}
          </h1>
          <div className="mt-2">
            <StatusBadge status={batch.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/app/traceability?code=${encodeURIComponent(batch.batchCode)}`}
            >
              Lihat Traceability
            </Link>
          </Button>
          {permissions.canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/batches/${batch._id}/edit`}>Edit</Link>
            </Button>
          )}
          {showHold && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAction("hold")}
            >
              Hold
            </Button>
          )}
          {showRelease && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAction("release")}
            >
              Release
            </Button>
          )}
          {showRecall && (
            <Button
              size="sm"
              className="bg-danger hover:bg-danger/90"
              onClick={() => setAction("recall")}
            >
              Recall
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Produksi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field
            label="SPPG"
            value={batch.sppg ? `${batch.sppg.code} — ${batch.sppg.name}` : "—"}
          />
          <Field
            label="Tanggal Produksi"
            value={new Date(batch.productionDate).toLocaleDateString("id-ID", {
              dateStyle: "medium",
            })}
          />
          <Field
            label="Tanggal Kedaluwarsa"
            value={
              batch.expiryAt
                ? new Date(batch.expiryAt).toLocaleDateString("id-ID", {
                    dateStyle: "medium",
                  })
                : "—"
            }
          />
          <Field label="Dibuat oleh" value={batch.createdBy?.name ?? "—"} />
          {batch.updatedBy && (
            <Field
              label="Terakhir diperbarui oleh"
              value={batch.updatedBy.name}
            />
          )}
        </CardContent>
        {batch.productionNotes && (
          <CardContent className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted">Catatan Produksi</p>
            <p className="mt-1 text-sm text-foreground">
              {batch.productionNotes}
            </p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bahan Baku</CardTitle>
        </CardHeader>
        <CardContent>
          {batch.ingredients.length === 0 ? (
            <p className="text-sm text-muted">Belum ada bahan baku tercatat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Bahan</TableHead>
                  <TableHead>Pemasok</TableHead>
                  <TableHead>Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.ingredients.map((ingredient) => (
                  <TableRow
                    key={`${ingredient.supplier?._id ?? "x"}-${ingredient.ingredientName}-${ingredient.supplierBatchCode ?? ""}`}
                  >
                    <TableCell>{ingredient.ingredientName}</TableCell>
                    <TableCell>
                      {ingredient.supplier
                        ? `${ingredient.supplier.code} — ${ingredient.supplier.name}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {ingredient.quantity} {ingredient.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {batch.storageTemperature.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Catatan Suhu Penyimpanan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {batch.storageTemperature.map((reading) => (
              <div
                key={reading.recordedAt}
                className="flex justify-between text-sm"
              >
                <span className="text-muted">
                  {new Date(reading.recordedAt).toLocaleString("id-ID")}
                </span>
                <span className="font-mono font-semibold">
                  {reading.value}°C
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <BatchContainmentDialog
        batchId={batch._id}
        batchCode={batch.batchCode}
        action={action}
        onOpenChange={(open) => !open && setAction(null)}
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
