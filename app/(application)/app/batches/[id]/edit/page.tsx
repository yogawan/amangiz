import type { Types } from "mongoose";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BatchForm } from "@/components/batches/batch-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/current-user";
import { idOf } from "@/lib/mongo-ref";
import { toObjectId } from "@/lib/validations/common";
import { getBatchById } from "@/services/batch.service";

export const metadata: Metadata = { title: "Edit Batch - AMANGIZ" };

function parseId(id: string): Types.ObjectId | null {
  try {
    return toObjectId(id);
  } catch {
    return null;
  }
}

async function EditBatchGate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  // PRD §8.8: updating a batch is Admin / SPPG Operator only.
  if (actor.role !== "admin" && actor.role !== "sppg_operator") {
    redirect(`/app/batches/${id}`);
  }

  const objectId = parseId(id);
  if (!objectId) notFound();

  const batch = await getBatchById(actor, objectId).catch((error) => {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  });
  if (!batch) notFound();

  if (
    actor.role === "sppg_operator" &&
    idOf(batch.sppgId) !== String(actor.organizationId)
  ) {
    redirect(`/app/batches/${id}`);
  }

  return (
    <BatchForm
      mode="edit"
      initial={{
        _id: String(batch._id),
        menuName: batch.menuName,
        productionDate: new Date(batch.productionDate).toISOString(),
        expiryAt: batch.expiryAt
          ? new Date(batch.expiryAt).toISOString()
          : undefined,
        productionNotes: batch.productionNotes,
        ingredients: batch.ingredients.map((ingredient) => ({
          supplierId: idOf(ingredient.supplierId),
          ingredientName: ingredient.ingredientName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          supplierBatchCode: ingredient.supplierBatchCode,
        })),
      }}
    />
  );
}

export default function EditBatchPage({
  params,
}: PageProps<"/app/batches/[id]/edit">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Batch</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditBatchGate params={params} />
      </Suspense>
    </div>
  );
}
