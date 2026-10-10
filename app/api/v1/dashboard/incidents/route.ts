import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { incidentScope } from "@/lib/permissions";
import {
  mergeFilters,
  paginationSchema,
  parseQuery,
} from "@/lib/validations/common";
import Incident from "@/models/Incident";

/** Recent and unresolved incidents for the dashboard (PRD 8.3, 9.2 #3). */
export const GET = route(async (request) => {
  const user = await requireUser();
  const { limit } = parseQuery(request, paginationSchema);
  const scope = incidentScope(user);

  const [recent, awaitingAction] = await Promise.all([
    Incident.find(scope)
      .select(
        "incidentCode title incidentType status severity reportedAt reportedAffectedCount batchId schoolId",
      )
      .populate("schoolId", "code name")
      .populate("batchId", "batchCode menuName")
      .sort({ reportedAt: -1 })
      .limit(limit)
      .lean()
      .exec(),
    Incident.find(
      mergeFilters(scope, { status: { $in: ["reported", "triaged"] } }),
    )
      .select("incidentCode title status severity reportedAt")
      .sort({ reportedAt: 1 })
      .limit(limit)
      .lean()
      .exec(),
  ]);

  return ok({ recent, awaitingAction }, { limit });
});
