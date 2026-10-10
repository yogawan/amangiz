import { loadIncidentForRead } from "@/lib/access";
import { type IdParam, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notifyRoles } from "@/lib/notifications";
import {
  assertCanReadRiskAssessment,
  assertCanRunRiskAssessment,
} from "@/lib/permissions";
import {
  paginationMeta,
  paginationSchema,
  parseQuery,
  routeObjectId,
  skipFor,
} from "@/lib/validations/common";
import RiskAssessment from "@/models/RiskAssessment";
import { runRiskAssessment } from "@/services/risk-assessment.service";

const DISCLAIMER =
  "Rule-based prioritisation aid only. Not a probability of food poisoning and not a medical diagnosis.";

/** Assessment history for one incident (PRD 8.11). */
export const GET = route<IdParam>(async (request, { params }) => {
  const user = await requireUser();
  assertCanReadRiskAssessment(user);

  const id = await routeObjectId(params);
  await loadIncidentForRead(user, id);

  const query = parseQuery(request, paginationSchema);

  const [items, total] = await Promise.all([
    RiskAssessment.find({ incidentId: id })
      .populate("assessedBy", "name role")
      .sort({ assessedAt: -1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    RiskAssessment.countDocuments({ incidentId: id }).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total), {
    disclaimer: DISCLAIMER,
  });
});

/** Runs the rule-based engine and stores a new assessment record (PRD 8.11). */
export const POST = route<IdParam>(async (_request, { params }) => {
  const actor = await requireUser();
  assertCanRunRiskAssessment(actor);

  const id = await routeObjectId(params);
  const incident = await loadIncidentForRead(actor, id);

  const assessment = await runRiskAssessment(incident, actor.id);

  await recordAudit({
    actorId: actor.id,
    action: "incident.risk_assessment",
    resourceType: "RiskAssessment",
    resourceId: assessment._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    metadata: {
      incidentId: id,
      score: assessment.score,
      level: assessment.level,
      engineVersion: assessment.engineVersion,
    },
  });

  if (assessment.level === "high" || assessment.level === "critical") {
    await notifyRoles(["admin", "investigator"], {
      type: "risk_escalated",
      title: `Incident ${incident.incidentCode} scored ${assessment.level}`,
      message: `Rule-based score ${assessment.score}. ${assessment.rulesTriggered.length} rule(s) triggered.`,
      resourceType: "incident",
      resourceId: incident._id,
    });
  }

  return created(assessment, { disclaimer: DISCLAIMER });
});
