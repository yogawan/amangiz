import { loadInvestigationForWrite } from "@/lib/access";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { routeObjectId } from "@/lib/validations/common";
import { addFindingSchema } from "@/lib/validations/investigation";

/**
 * Records an investigation finding (PRD 8.12).
 *
 * Findings are evidence-backed observations and are kept distinct from the
 * initial report and from the risk score (PRD 6.4 #4).
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = addFindingSchema.parse(await readJson(request));

  const investigation = await loadInvestigationForWrite(actor, id);

  investigation.findings.push({
    title: input.title,
    description: input.description,
    evidenceUrls: input.evidenceUrls,
  });

  if (investigation.status === "pending") {
    investigation.status = "in_progress";
  }
  await investigation.save();

  await recordAudit({
    actorId: actor.id,
    action: "investigation.finding_add",
    resourceType: "Investigation",
    resourceId: investigation._id,
    metadata: { title: input.title, evidenceCount: input.evidenceUrls.length },
  });

  return created(investigation.findings.at(-1));
});
