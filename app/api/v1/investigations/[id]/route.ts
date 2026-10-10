import {
  loadInvestigationForRead,
  loadInvestigationForWrite,
} from "@/lib/access";
import { unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId, toObjectId } from "@/lib/validations/common";
import { updateInvestigationSchema } from "@/lib/validations/investigation";
import type { IAuditLogChange } from "@/models/AuditLog";
import Investigation from "@/models/Investigation";
import User from "@/models/User";

export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  await loadInvestigationForRead(user, id);

  const investigation = await Investigation.findById(id)
    .populate(
      "incidentId",
      "incidentCode title description status severity reportedAt reportedAffectedCount batchId schoolId",
    )
    .populate("assignedTo", "name email role")
    .populate("timeline.actorId", "name role")
    .populate("correctiveActions.ownerId", "name email")
    .lean()
    .exec();

  return ok(investigation);
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = updateInvestigationSchema.parse(await readJson(request));

  const investigation = await loadInvestigationForWrite(actor, id);
  const changes: IAuditLogChange[] = [];

  // Reassignment is an admin decision, not something an investigator can do to
  // hand their own case off.
  if (input.assignedTo) {
    if (!isAdmin(actor)) {
      throw unprocessable("Only an admin may reassign an investigation");
    }
    const assignedTo = toObjectId(input.assignedTo);
    const assignee = await User.findById(assignedTo)
      .select("role isActive")
      .lean()
      .exec();
    if (!assignee?.isActive) {
      throw unprocessable("Assignee must be an active user");
    }
    if (assignee.role !== "investigator" && assignee.role !== "admin") {
      throw unprocessable("Assignee must hold the investigator or admin role");
    }
    changes.push({
      field: "assignedTo",
      before: investigation.assignedTo,
      after: assignedTo,
    });
    investigation.assignedTo = assignedTo;
  }

  // "completed" is reached through the dedicated /complete endpoint so the
  // conclusion is always captured with it.
  if (input.status) {
    if (input.status === "completed") {
      throw unprocessable(
        "Use POST /investigations/:id/complete to finish an investigation",
      );
    }
    changes.push({
      field: "status",
      before: investigation.status,
      after: input.status,
    });
    investigation.status = input.status;
  }

  if (input.rootCauseStatus) {
    changes.push({
      field: "rootCauseStatus",
      before: investigation.rootCauseStatus,
      after: input.rootCauseStatus,
    });
    investigation.rootCauseStatus = input.rootCauseStatus;
  }
  if (input.rootCauseSummary !== undefined) {
    investigation.rootCauseSummary = input.rootCauseSummary;
  }
  if (input.conclusion !== undefined) {
    investigation.conclusion = input.conclusion;
  }

  await investigation.save();

  await recordAudit({
    actorId: actor.id,
    action: "investigation.update",
    resourceType: "Investigation",
    resourceId: investigation._id,
    changes,
  });

  return ok(investigation);
});
