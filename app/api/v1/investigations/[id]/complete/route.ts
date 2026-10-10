import { loadInvestigationForWrite } from "@/lib/access";
import { unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notifyRoles } from "@/lib/notifications";
import { routeObjectId } from "@/lib/validations/common";
import { completeInvestigationSchema } from "@/lib/validations/investigation";
import Incident from "@/models/Incident";

/**
 * Completes an investigation (PRD 8.12).
 *
 * Completing the investigation does NOT close the incident. PRD 8.12 states the
 * two are related but not identical, so the incident still has to be resolved
 * and closed through its own endpoints by an authorised officer.
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const { conclusion } = completeInvestigationSchema.parse(
    await readJson(request),
  );

  const investigation = await loadInvestigationForWrite(actor, id);

  if (investigation.sampleTesting?.status === "requested") {
    throw unprocessable(
      "Sample testing is still outstanding. Record or cancel the laboratory result first.",
    );
  }

  const openActions = investigation.correctiveActions.filter(
    (action) => action.status !== "completed",
  );
  if (openActions.length > 0) {
    throw unprocessable(
      `${openActions.length} corrective action(s) are still open and must be completed first`,
    );
  }

  // An investigation that concludes nothing and finds nothing is not a
  // documented investigation.
  if (investigation.findings.length === 0) {
    throw unprocessable(
      "Record at least one finding before completing the investigation",
    );
  }

  const previousStatus = investigation.status;
  investigation.status = "completed";
  investigation.conclusion = conclusion;
  investigation.completedAt = new Date();

  // Root cause stays "undetermined" unless it was explicitly determined with a
  // summary; completing an investigation never implies a cause was found.
  if (investigation.rootCauseStatus === "under_review") {
    investigation.rootCauseStatus = "undetermined";
  }

  await investigation.save();

  await recordAudit({
    actorId: actor.id,
    action: "investigation.complete",
    resourceType: "Investigation",
    resourceId: investigation._id,
    changes: [{ field: "status", before: previousStatus, after: "completed" }],
    metadata: {
      rootCauseStatus: investigation.rootCauseStatus,
      findingCount: investigation.findings.length,
    },
  });

  const incident = await Incident.findById(investigation.incidentId)
    .select("incidentCode sppgId schoolId")
    .lean()
    .exec();

  if (incident) {
    await notifyRoles(["admin"], {
      type: "investigation_updated",
      title: `Investigation completed for ${incident.incidentCode}`,
      message:
        "The investigation is complete. The incident still needs to be resolved and closed.",
      resourceType: "incident",
      resourceId: investigation.incidentId,
    });
  }

  return ok({
    id: investigation._id,
    status: investigation.status,
    completedAt: investigation.completedAt,
    rootCauseStatus: investigation.rootCauseStatus,
    incidentStillOpen: true,
  });
});
