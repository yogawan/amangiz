import type { Types } from "mongoose";
import type { z } from "zod";
import { loadDistributionForRead } from "@/lib/access";
import type { AuthUser } from "@/lib/auth/guard";
import { distributionScope } from "@/lib/permissions";
import {
  buildSort,
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  searchFilter,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import type { distributionListQuerySchema } from "@/lib/validations/distribution";
import AuditLog from "@/models/AuditLog";
import Distribution from "@/models/Distribution";

/**
 * Read queries for `/app/distribution` (PRD 8.9), extracted from
 * app/api/v1/distributions/**\/route.ts GET handlers (UI_PLAN.md §0
 * no-logic-drift rule).
 */

type DistributionListQuery = z.infer<typeof distributionListQuerySchema>;

const LIST_SORTABLE = [
  "distributionCode",
  "scheduledAt",
  "dispatchedAt",
  "receivedAt",
  "status",
  "createdAt",
] as const;

export async function listDistributions(
  actor: AuthUser,
  query: DistributionListQuery,
) {
  const filter = mergeFilters(
    distributionScope(actor),
    searchFilter(query.search, ["distributionCode"]),
    query.status ? { status: query.status } : {},
    query.batchId ? { batchId: toObjectId(query.batchId) } : {},
    query.schoolId ? { schoolId: toObjectId(query.schoolId) } : {},
    query.sppgId ? { sppgId: toObjectId(query.sppgId) } : {},
    dateRangeFilter("scheduledAt", query.from, query.to),
  );

  const [data, total] = await Promise.all([
    Distribution.find(filter)
      .populate("batchId", "batchCode menuName status")
      .populate("schoolId", "code name level")
      .sort(
        buildSort(query.sortBy, query.sortOrder, LIST_SORTABLE, "scheduledAt"),
      )
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Distribution.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

export async function getDistributionById(actor: AuthUser, id: Types.ObjectId) {
  await loadDistributionForRead(actor, id);

  return Distribution.findById(id)
    .populate("batchId", "batchCode menuName productionDate status sppgId")
    .populate("schoolId", "code name level address")
    .populate("sppgId", "code name")
    .populate("createdBy", "name email")
    .lean()
    .exec();
}

interface TimelineEntry {
  at: Date;
  event: string;
  label: string;
  detail?: Record<string, unknown>;
}

/** Synthesised shipment history — only ever built from timestamps that were actually recorded. */
export async function getDistributionTimeline(
  actor: AuthUser,
  id: Types.ObjectId,
) {
  const distribution = await loadDistributionForRead(actor, id);

  const entries: TimelineEntry[] = [
    {
      at: distribution.createdAt,
      event: "created",
      label: "Distribution record created",
    },
  ];

  if (distribution.scheduledAt) {
    entries.push({
      at: distribution.scheduledAt,
      event: "scheduled",
      label: "Scheduled for delivery",
    });
  }
  if (distribution.dispatchedAt) {
    entries.push({
      at: distribution.dispatchedAt,
      event: "dispatched",
      label: "Dispatched from SPPG",
      detail: { temperature: distribution.dispatchTemperature ?? null },
    });
  }
  if (distribution.receivedAt) {
    entries.push({
      at: distribution.receivedAt,
      event: "received",
      label: "Received at school",
      detail: { temperature: distribution.receivedTemperature ?? null },
    });
  }

  const auditTrail = await AuditLog.find({
    resourceType: "Distribution",
    resourceId: id,
  })
    .select("action createdAt actorId metadata changes")
    .populate("actorId", "name role")
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  return {
    distributionCode: distribution.distributionCode,
    status: distribution.status,
    receiptConfirmed: Boolean(distribution.receivedAt),
    timeline: entries.sort((a, b) => a.at.getTime() - b.at.getTime()),
    auditTrail,
  };
}
