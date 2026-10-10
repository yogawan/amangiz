import type { Types } from "mongoose";
import { notFound } from "@/lib/api/errors";
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
