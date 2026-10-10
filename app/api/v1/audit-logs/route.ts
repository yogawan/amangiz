import { z } from "zod";
import { route } from "@/lib/api/handler";
import { paginated } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { assertCanReadAuditLog, auditLogScope } from "@/lib/permissions";
import {
  dateRangeFilter,
  listQuerySchema,
  mergeFilters,
  objectIdSchema,
  paginationMeta,
  parseQuery,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import AuditLog from "@/models/AuditLog";

const querySchema = listQuerySchema.extend({
  action: z.string().trim().min(2).optional(),
  resourceType: z.string().trim().min(2).optional(),
  resourceId: objectIdSchema.optional(),
  actorId: objectIdSchema.optional(),
});

/**
 * Read-only activity trail (PRD 8.14).
 *
 * There is deliberately no POST/PATCH/DELETE in this directory: audit entries
 * are written server-side when an operation succeeds and must not be editable
 * through ordinary CRUD (PRD 7.13).
 */
export const GET = route(async (request) => {
  const user = await requireUser();
  assertCanReadAuditLog(user);

  const query = parseQuery(request, querySchema);

  const filter = mergeFilters(
    auditLogScope(user),
    query.action ? { action: query.action } : {},
    query.resourceType ? { resourceType: query.resourceType } : {},
    query.resourceId ? { resourceId: toObjectId(query.resourceId) } : {},
    query.actorId ? { actorId: toObjectId(query.actorId) } : {},
    dateRangeFilter("createdAt", query.from, query.to),
  );

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actorId", "name email role")
      .sort({ createdAt: query.sortOrder === "asc" ? 1 : -1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    AuditLog.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});
