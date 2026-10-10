import { loadIncidentForRead } from "@/lib/access";
import { notFound } from "@/lib/api/errors";
import { type IdParam, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { assertCanReadRiskAssessment } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import RiskAssessment from "@/models/RiskAssessment";

/**
 * One assessment in detail (PRD 8.11), including the rules that fired, the data
 * still missing, the engine version, and when it ran.
 */
export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  assertCanReadRiskAssessment(user);

  const id = await routeObjectId(params);

  const assessment = await RiskAssessment.findById(id)
    .populate("assessedBy", "name role")
    .lean()
    .exec();
  if (!assessment) throw notFound("Risk assessment not found");

  // Authorised through the parent incident, so an assessment cannot be read by
  // someone who has no access to the case it belongs to.
  await loadIncidentForRead(user, assessment.incidentId);

  return ok(assessment, {
    disclaimer:
      "Rule-based prioritisation aid only. Not a probability of food poisoning and not a medical diagnosis.",
  });
});
