import type { z } from "zod";
import type { AuthUser } from "@/lib/auth/guard";
import { assertCanReadAuditLog, auditLogScope } from "@/lib/permissions";
import type { auditLogListQuerySchema } from "@/lib/validations/audit-log";
import {
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import AuditLog from "@/models/AuditLog";

/**
 * Read for `/app/audit-log` and the dashboard's "recent activity", mirroring
 * app/api/v1/audit-logs/route.ts GET (UI_PLAN.md §0 no-logic-drift rule).
 */

type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;

export async function listAuditLogs(actor: AuthUser, query: AuditLogListQuery) {
  assertCanReadAuditLog(actor);

  const filter = mergeFilters(
    auditLogScope(actor),
    query.action ? { action: query.action } : {},
    query.resourceType ? { resourceType: query.resourceType } : {},
    query.resourceId ? { resourceId: toObjectId(query.resourceId) } : {},
    query.actorId ? { actorId: toObjectId(query.actorId) } : {},
    dateRangeFilter("createdAt", query.from, query.to),
  );

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actorId", "name email role")
      .sort({ createdAt: query.sortOrder === "asc" ? 1 : -1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    AuditLog.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

/** Entry counts for the `/app/audit-log` stat row, same scope as the list. */
export async function getAuditLogSummary(actor: AuthUser) {
  assertCanReadAuditLog(actor);

  const scope = auditLogScope(actor);
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [total, today, thisWeek] = await Promise.all([
    AuditLog.countDocuments(scope).exec(),
    AuditLog.countDocuments(
      mergeFilters(scope, { createdAt: { $gte: todayStart } }),
    ).exec(),
    AuditLog.countDocuments(
      mergeFilters(scope, { createdAt: { $gte: weekStart } }),
    ).exec(),
  ]);

  return { total, today, thisWeek };
}
