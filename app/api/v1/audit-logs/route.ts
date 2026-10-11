import { route } from "@/lib/api/handler";
import { paginated } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { auditLogListQuerySchema } from "@/lib/validations/audit-log";
import { parseQuery } from "@/lib/validations/common";
import { listAuditLogs } from "@/services/audit-log.service";

/**
 * Read-only activity trail (PRD 8.14).
 *
 * There is deliberately no POST/PATCH/DELETE in this directory: audit entries
 * are written server-side when an operation succeeds and must not be editable
 * through ordinary CRUD (PRD 7.13).
 */
export const GET = route(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, auditLogListQuerySchema);
  const { data, pagination } = await listAuditLogs(user, query);
  return paginated(data, pagination);
});
