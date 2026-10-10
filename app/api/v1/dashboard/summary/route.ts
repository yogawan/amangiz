import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { getDashboardSummary } from "@/services/dashboard.service";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getDashboardSummary(user));
});
