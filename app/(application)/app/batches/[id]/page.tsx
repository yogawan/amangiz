import type { Types } from "mongoose";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BatchDetail } from "@/components/batches/batch-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { toObjectId } from "@/lib/validations/common";
import { ALLOWED_ROLES, getBatchById } from "@/services/batch.service";

export const metadata: Metadata = { title: "Detail Batch — AMANGIZ" };

function parseId(id: string): Types.ObjectId | null {
  try {
    return toObjectId(id);
  } catch {
    return null;
  }
}

async function BatchDetailGate({ id }: { id: string }) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const objectId = parseId(id);
  if (!objectId) notFound();

  const batch = await getBatchById(actor, objectId).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) {
      redirect("/app/batches");
    }
    throw error;
  });
  if (!batch) notFound();

  const sppg = populatedRef<{ code: string; name: string }>(batch.sppgId, [
    "code",
    "name",
  ]);
  const createdBy = populatedRef<{ name: string; email: string }>(
    batch.createdBy,
    ["name", "email"],
  );
  const updatedBy = populatedRef<{ name: string; email: string }>(
    batch.updatedBy,
    ["name", "email"],
  );

  return (
    <BatchDetail
      batch={{
        _id: String(batch._id),
        batchCode: batch.batchCode,
        menuName: batch.menuName,
        productionDate: new Date(batch.productionDate).toISOString(),
        expiryAt: batch.expiryAt
          ? new Date(batch.expiryAt).toISOString()
          : undefined,
        productionNotes: batch.productionNotes,
        status: batch.status,
        sppg: sppg
          ? { _id: String(sppg._id), code: sppg.code, name: sppg.name }
          : null,
        ingredients: batch.ingredients.map((ingredient) => {
          const supplier = populatedRef<{ code: string; name: string }>(
            ingredient.supplierId,
            ["code", "name"],
          );
          return {
            ingredientName: ingredient.ingredientName,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            supplierBatchCode: ingredient.supplierBatchCode,
            supplier: supplier
              ? {
                  _id: String(supplier._id),
                  code: supplier.code,
                  name: supplier.name,
                }
              : null,
          };
        }),
        storageTemperature: (batch.storageTemperature ?? []).map((reading) => ({
          value: reading.value,
          recordedAt: new Date(reading.recordedAt).toISOString(),
        })),
        createdBy: createdBy
          ? { name: createdBy.name, email: createdBy.email }
          : null,
        updatedBy: updatedBy
          ? { name: updatedBy.name, email: updatedBy.email }
          : null,
      }}
      permissions={{
        canEdit: actor.role === "admin" || actor.role === "sppg_operator",
        canHold: ALLOWED_ROLES.hold.includes(actor.role),
        canRelease: ALLOWED_ROLES.release.includes(actor.role),
        canRecall: ALLOWED_ROLES.recall.includes(actor.role),
      }}
    />
  );
}

export default async function BatchDetailPage({
  params,
}: PageProps<"/app/batches/[id]">) {
  const { id } = await params;

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BatchDetailGate id={id} />
    </Suspense>
  );
}
