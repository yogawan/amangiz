import type { Types } from "mongoose";
import { loadBatchForRead } from "@/lib/access";
import { notFound } from "@/lib/api/errors";
import type { AuthUser } from "@/lib/auth/guard";
import Distribution from "@/models/Distribution";
import FoodBatch from "@/models/FoodBatch";
import Incident from "@/models/Incident";

/**
 * Builds the batch trace described in PRD 9.2 #5:
 * Supplier → Ingredients → FoodBatch → SPPG → Distribution → School → Incident
 *
 * Only relationships that are actually recorded are returned. Each distribution
 * node carries explicit `dispatchRecorded` / `receiptConfirmed` flags so the UI
 * can never present an unrecorded leg as a verified delivery — the PRD calls
 * this out specifically.
 */

interface PopulatedRef {
  _id: Types.ObjectId;
  code?: string;
  name?: string;
}

export interface TraceabilityResult {
  batch: unknown;
  sppg: PopulatedRef | null;
  suppliers: Array<{
    supplier: PopulatedRef | null;
    ingredientName: string;
    quantity: number;
    unit: string;
    supplierBatchCode?: string;
  }>;
  distributions: Array<{
    id: Types.ObjectId;
    distributionCode: string;
    school: PopulatedRef | null;
    quantity: number;
    unit: string;
    status: string;
    scheduledAt?: Date;
    dispatchedAt?: Date;
    receivedAt?: Date;
    dispatchTemperature?: number;
    receivedTemperature?: number;
    dispatchRecorded: boolean;
    receiptConfirmed: boolean;
    deliveryEvidence: Array<{
      url: string;
      publicId: string;
      uploadedAt: Date;
    }>;
  }>;
  relatedIncidents: unknown[];
  summary: {
    totalDistributions: number;
    confirmedReceipts: number;
    pendingReceipts: number;
    totalQuantityDistributed: number;
    schoolsReached: number;
    relatedIncidentCount: number;
  };
}

export async function buildBatchTraceability(
  batchId: Types.ObjectId,
): Promise<TraceabilityResult> {
  const batch = await FoodBatch.findById(batchId)
    .populate("sppgId", "code name status address")
    .populate(
      "ingredients.supplierId",
      "code name supplierType verificationStatus",
    )
    .lean()
    .exec();

  if (!batch) throw notFound("Batch not found");

  const distributions = await Distribution.find({ batchId })
    .populate("schoolId", "code name level address")
    .sort({ scheduledAt: 1, createdAt: 1 })
    .lean()
    .exec();

  const distributionIds = distributions.map((distribution) => distribution._id);

  const relatedIncidents = await Incident.find({
    $or: [{ batchId }, { distributionId: { $in: distributionIds } }],
  })
    .select(
      "incidentCode title incidentType status severity reportedAt reportedAffectedCount schoolId distributionId",
    )
    .populate("schoolId", "code name")
    .sort({ reportedAt: -1 })
    .lean()
    .exec();

  const nodes = distributions.map((distribution) => ({
    id: distribution._id,
    distributionCode: distribution.distributionCode,
    school: (distribution.schoolId as unknown as PopulatedRef) ?? null,
    quantity: distribution.quantity,
    unit: distribution.unit,
    status: distribution.status,
    scheduledAt: distribution.scheduledAt,
    dispatchedAt: distribution.dispatchedAt,
    receivedAt: distribution.receivedAt,
    dispatchTemperature: distribution.dispatchTemperature,
    receivedTemperature: distribution.receivedTemperature,
    dispatchRecorded: Boolean(distribution.dispatchedAt),
    receiptConfirmed: Boolean(distribution.receivedAt),
    deliveryEvidence: distribution.deliveryEvidence ?? [],
  }));

  const uniqueSchools = new Set(
    nodes
      .map((node) => node.school?._id?.toString())
      .filter((value): value is string => Boolean(value)),
  );

  return {
    batch,
    sppg: (batch.sppgId as unknown as PopulatedRef) ?? null,
    suppliers: (batch.ingredients ?? []).map((ingredient) => ({
      supplier: (ingredient.supplierId as unknown as PopulatedRef) ?? null,
      ingredientName: ingredient.ingredientName,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      supplierBatchCode: ingredient.supplierBatchCode,
    })),
    distributions: nodes,
    relatedIncidents,
    summary: {
      totalDistributions: nodes.length,
      confirmedReceipts: nodes.filter((node) => node.receiptConfirmed).length,
      pendingReceipts: nodes.filter((node) => !node.receiptConfirmed).length,
      totalQuantityDistributed: nodes.reduce(
        (total, node) => total + node.quantity,
        0,
      ),
      schoolsReached: uniqueSchools.size,
      relatedIncidentCount: relatedIncidents.length,
    },
  };
}

/**
 * Search entry point for `/app/traceability` (PRD 9.2 #5). Looks the batch up
 * by its human-entered code, then authorises the caller against it the same
 * way the batch detail route does (PRD 3.2: Traceability is Full for
 * admin/investigator, Own for SPPG/School operators) — so this never returns
 * more than `/app/batches/[id]` would let the same user see. Returns `null`
 * for "no such batch" so the page can show a plain not-found state instead of
 * an error boundary; an authorization failure still throws.
 */
export async function getTraceabilityByBatchCode(
  actor: AuthUser,
  batchCode: string,
): Promise<TraceabilityResult | null> {
  const batch = await FoodBatch.findOne({ batchCode: batchCode.trim() })
    .select("_id")
    .lean()
    .exec();
  if (!batch) return null;

  await loadBatchForRead(actor, batch._id);
  return buildBatchTraceability(batch._id);
}
