import type { Types } from "mongoose";
import type { z } from "zod";
import { loadInvestigationForRead } from "@/lib/access";
import type { AuthUser } from "@/lib/auth/guard";
import { assertCanReadInvestigations } from "@/lib/permissions";
import {
  buildSort,
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import type { investigationListQuerySchema } from "@/lib/validations/investigation";
import Investigation from "@/models/Investigation";

/**
 * Read queries for `/app/investigations` (PRD 8.12), extracted from
 * app/api/v1/investigations/**\/route.ts GET handlers (UI_PLAN.md §0
 * no-logic-drift rule).
 */

type InvestigationListQuery = z.infer<typeof investigationListQuerySchema>;

const LIST_SORTABLE = ["status", "createdAt", "completedAt"] as const;

/** Queue read, restricted to admin/investigator — same as the route. */
export async function listInvestigations(
  actor: AuthUser,
  query: InvestigationListQuery,
) {
  assertCanReadInvestigations(actor);

  const filter = mergeFilters(
    query.status ? { status: query.status } : {},
    query.assignedTo ? { assignedTo: toObjectId(query.assignedTo) } : {},
    query.rootCauseStatus ? { rootCauseStatus: query.rootCauseStatus } : {},
    dateRangeFilter("createdAt", query.from, query.to),
  );

  const [data, total] = await Promise.all([
    Investigation.find(filter)
      .populate("incidentId", "incidentCode title status severity reportedAt")
      .populate("assignedTo", "name email")
      .sort(
        buildSort(query.sortBy, query.sortOrder, LIST_SORTABLE, "createdAt"),
      )
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Investigation.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

/** Status counts for the `/app/investigations` stat row, same scope as the queue. */
export async function getInvestigationSummary(actor: AuthUser) {
  assertCanReadInvestigations(actor);

  const [total, pending, inProgress, completed] = await Promise.all([
    Investigation.countDocuments({}).exec(),
    Investigation.countDocuments({ status: "pending" }).exec(),
    Investigation.countDocuments({ status: "in_progress" }).exec(),
    Investigation.countDocuments({ status: "completed" }).exec(),
  ]);

  return { total, pending, inProgress, completed };
}

/** Detail read for `/app/investigations/[id]`. */
export async function getInvestigationById(
  actor: AuthUser,
  id: Types.ObjectId,
) {
  await loadInvestigationForRead(actor, id);

  return Investigation.findById(id)
    .populate(
      "incidentId",
      "incidentCode title description status severity reportedAt reportedAffectedCount batchId schoolId",
    )
    .populate("assignedTo", "name email role")
    .populate("timeline.actorId", "name role")
    .populate("correctiveActions.ownerId", "name email")
    .lean()
    .exec();
}
