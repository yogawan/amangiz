import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { paginationSchema, parseQuery } from "@/lib/validations/common";
import { getDashboardIncidents } from "@/services/dashboard.service";

export const GET = route(async (request) => {
  const user = await requireUser();
  const { limit } = parseQuery(request, paginationSchema);
  return ok(await getDashboardIncidents(user, limit), { limit });
});
