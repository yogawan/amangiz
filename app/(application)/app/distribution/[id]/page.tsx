import type { Types } from "mongoose";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DistributionDetail } from "@/components/distribution/distribution-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/current-user";
import { idOf, populatedRef } from "@/lib/mongo-ref";
import { toObjectId } from "@/lib/validations/common";
import {
  getDistributionById,
  getDistributionTimeline,
} from "@/services/distribution.service";

export const metadata: Metadata = { title: "Detail Distribusi — AMANGIZ" };

const DISPATCHABLE = new Set(["planned", "delayed"]);
const RECEIVABLE = new Set(["dispatched", "in_transit", "delayed"]);

function parseId(id: string): Types.ObjectId | null {
  try {
    return toObjectId(id);
  } catch {
    return null;
  }
}

async function DistributionDetailGate({ id }: { id: string }) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const objectId = parseId(id);
  if (!objectId) notFound();

  const handleAccessError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) {
      redirect("/app/distribution");
    }
    throw error;
  };

  const [distribution, timelineResult] = await Promise.all([
    getDistributionById(actor, objectId).catch(handleAccessError),
    getDistributionTimeline(actor, objectId).catch(handleAccessError),
  ]);
  if (!distribution || !timelineResult) notFound();

  const batch = populatedRef<{ batchCode: string; menuName: string }>(
    distribution.batchId,
    ["batchCode", "menuName"],
  );
  const school = populatedRef<{ code: string; name: string }>(
    distribution.schoolId,
    ["code", "name"],
  );
  const sppg = populatedRef<{ code: string; name: string }>(
    distribution.sppgId,
    ["code", "name"],
  );

  const ownSppg =
    actor.role === "sppg_operator" &&
    idOf(distribution.sppgId) === String(actor.organizationId);
  const ownSchool =
    actor.role === "school_operator" &&
    idOf(distribution.schoolId) === String(actor.organizationId);

  const canDispatch =
    (actor.role === "admin" || ownSppg) &&
    DISPATCHABLE.has(distribution.status);
  const canReceive =
    (actor.role === "admin" || ownSchool) &&
    RECEIVABLE.has(distribution.status);

  return (
    <DistributionDetail
      distribution={{
        _id: String(distribution._id),
        distributionCode: distribution.distributionCode,
        status: distribution.status,
        quantity: distribution.quantity,
        unit: distribution.unit,
        scheduledAt: distribution.scheduledAt
          ? new Date(distribution.scheduledAt).toISOString()
          : undefined,
        dispatchedAt: distribution.dispatchedAt
          ? new Date(distribution.dispatchedAt).toISOString()
          : undefined,
        receivedAt: distribution.receivedAt
          ? new Date(distribution.receivedAt).toISOString()
          : undefined,
        dispatchTemperature: distribution.dispatchTemperature,
        receivedTemperature: distribution.receivedTemperature,
        notes: distribution.notes,
        batch: batch
          ? {
              _id: String(batch._id),
              batchCode: batch.batchCode,
              menuName: batch.menuName,
            }
          : null,
        school: school
          ? { _id: String(school._id), code: school.code, name: school.name }
          : null,
        sppg: sppg
          ? { _id: String(sppg._id), code: sppg.code, name: sppg.name }
          : null,
        deliveryEvidence: (distribution.deliveryEvidence ?? []).map(
          (evidence) => ({
            url: evidence.url,
            publicId: evidence.publicId,
            uploadedAt: new Date(evidence.uploadedAt).toISOString(),
          }),
        ),
      }}
      timeline={timelineResult.timeline.map((entry) => ({
        at: new Date(entry.at).toISOString(),
        event: entry.event,
        label: entry.label,
      }))}
      permissions={{
        canDispatch,
        canReceive,
        canUploadEvidence: actor.role !== "investigator",
      }}
    />
  );
}

export default async function DistributionDetailPage({
  params,
}: PageProps<"/app/distribution/[id]">) {
  const { id } = await params;

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DistributionDetailGate id={id} />
    </Suspense>
  );
}
