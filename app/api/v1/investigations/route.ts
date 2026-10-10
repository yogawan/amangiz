import { conflict, unprocessable } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notify } from "@/lib/notifications";
import { assertCanReadInvestigations, isAdmin } from "@/lib/permissions";
import {
  buildSort,
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  parseQuery,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import {
  createInvestigationSchema,
  investigationListQuerySchema,
} from "@/lib/validations/investigation";
import Incident from "@/models/Incident";
import Investigation from "@/models/Investigation";
import User from "@/models/User";

const SORTABLE = ["status", "createdAt", "completedAt"] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  assertCanReadInvestigations(user);

  const query = parseQuery(request, investigationListQuerySchema);

  // Investigators can see the whole queue but only mutate their own cases
  // (PRD 3.2 lists "Assigned / Full"), so reads are not narrowed here. Pass
  // ?assignedTo=<self> to get a personal queue.
  const filter = mergeFilters(
    query.status ? { status: query.status } : {},
    query.assignedTo ? { assignedTo: toObjectId(query.assignedTo) } : {},
    query.rootCauseStatus ? { rootCauseStatus: query.rootCauseStatus } : {},
    dateRangeFilter("createdAt", query.from, query.to),
  );

  const [items, total] = await Promise.all([
    Investigation.find(filter)
      .populate("incidentId", "incidentCode title status severity reportedAt")
      .populate("assignedTo", "name email")
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "createdAt"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Investigation.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  assertCanReadInvestigations(actor);

  const input = createInvestigationSchema.parse(await readJson(request));
  const incidentId = toObjectId(input.incidentId);
  const assignedTo = toObjectId(input.assignedTo);

  // Only an admin may open a case on someone else's behalf.
  if (!isAdmin(actor) && !assignedTo.equals(actor.id)) {
    throw unprocessable(
      "Investigators may only open an investigation assigned to themselves",
    );
  }

  const incident = await Incident.findById(incidentId)
    .select("incidentCode status sppgId schoolId")
    .lean()
    .exec();
  if (!incident)
    throw unprocessable("No incident found for the given incidentId");
  if (incident.status === "closed") {
    throw unprocessable("A closed incident cannot have a new investigation");
  }

  const assignee = await User.findById(assignedTo)
    .select("role isActive name")
    .lean()
    .exec();
  if (!assignee?.isActive) {
    throw unprocessable("Assignee must be an active user");
  }
  if (assignee.role !== "investigator" && assignee.role !== "admin") {
    throw unprocessable(
      `User "${assignee.name}" cannot be assigned as investigator`,
    );
  }

  const duplicate = await Investigation.exists({ incidentId }).exec();
  if (duplicate) {
    throw conflict("An investigation already exists for this incident");
  }

  const investigation = await Investigation.create({
    incidentId,
    assignedTo,
    status: "pending",
    rootCauseStatus: "undetermined",
  });

  await Incident.updateOne(
    { _id: incidentId },
    {
      $set: {
        assignedInvestigatorId: assignedTo,
        status: "under_investigation",
      },
    },
  ).exec();

  await recordAudit({
    actorId: actor.id,
    action: "investigation.create",
    resourceType: "Investigation",
    resourceId: investigation._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    metadata: { incidentId, incidentCode: incident.incidentCode },
  });

  await notify({
    recipientId: assignedTo,
    type: "action_required",
    title: `Investigation opened for ${incident.incidentCode}`,
    message: "You have been assigned to investigate this incident.",
    resourceType: "incident",
    resourceId: incidentId,
  });

  return created(investigation);
});
