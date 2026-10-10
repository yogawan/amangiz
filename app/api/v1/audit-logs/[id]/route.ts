import { notFound } from "@/lib/api/errors";
import { type IdParam, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { assertCanReadAuditLog, auditLogScope } from "@/lib/permissions";
import { mergeFilters, routeObjectId } from "@/lib/validations/common";
import AuditLog from "@/models/AuditLog";

/** One audit entry in detail (PRD 8.14). */
export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  assertCanReadAuditLog(user);

  const id = await routeObjectId(params);

  // The organization scope is applied in the query so a non-admin cannot read
  // an entry from outside their organization by guessing its id.
  const entry = await AuditLog.findOne(
    mergeFilters(auditLogScope(user), { _id: id }),
  )
    .populate("actorId", "name email role")
    .lean()
    .exec();

  if (!entry) throw notFound("Audit log entry not found");

  return ok(entry);
});
