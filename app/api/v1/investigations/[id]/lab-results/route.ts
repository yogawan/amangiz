import { loadInvestigationForWrite } from "@/lib/access";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notify } from "@/lib/notifications";
import { routeObjectId } from "@/lib/validations/common";
import { labResultSchema } from "@/lib/validations/investigation";
import Incident from "@/models/Incident";

/**
 * Records sample-testing status and results (PRD 8.12).
 *
 * The schema requires a laboratory name once testing is requested, and a
 * reference number, summary and receipt date once it is completed: PRD 2.5 and
 * 7.11 only permit a result to be recorded from a verifiable source.
 *
 * The result is stored as reported by the laboratory. The system does not
 * interpret it or derive a cause from it.
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = labResultSchema.parse(await readJson(request));

  const investigation = await loadInvestigationForWrite(actor, id);

  const previousStatus = investigation.sampleTesting?.status ?? "not_requested";

  investigation.set("sampleTesting", {
    status: input.status,
    laboratoryName: input.laboratoryName,
    referenceNumber: input.referenceNumber,
    resultSummary: input.resultSummary,
    resultDocumentUrl: input.resultDocumentUrl,
    resultReceivedAt: input.resultReceivedAt
      ? new Date(input.resultReceivedAt)
      : undefined,
  });

  // Waiting on a lab is a distinct state from actively working the case.
  if (input.status === "requested" || input.status === "in_progress") {
    investigation.status = "awaiting_external_result";
  } else if (
    input.status === "completed" &&
    investigation.status === "awaiting_external_result"
  ) {
    investigation.status = "in_progress";
  }

  await investigation.save();

  await recordAudit({
    actorId: actor.id,
    action: "investigation.lab_result",
    resourceType: "Investigation",
    resourceId: investigation._id,
    changes: [
      {
        field: "sampleTesting.status",
        before: previousStatus,
        after: input.status,
      },
    ],
    metadata: {
      laboratoryName: input.laboratoryName,
      referenceNumber: input.referenceNumber,
    },
  });

  if (input.status === "completed") {
    const incident = await Incident.findById(investigation.incidentId)
      .select("incidentCode reportedBy")
      .lean()
      .exec();
    if (incident) {
      await notify({
        recipientId: incident.reportedBy,
        type: "investigation_updated",
        title: `Laboratory result recorded for ${incident.incidentCode}`,
        message: `Result received from ${input.laboratoryName}.`,
        resourceType: "incident",
        resourceId: investigation.incidentId,
      });
    }
  }

  return ok({
    id: investigation._id,
    status: investigation.status,
    sampleTesting: investigation.sampleTesting,
  });
});
