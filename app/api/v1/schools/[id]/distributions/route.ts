import { forbidden, notFound } from "@/lib/api/errors";
import { type IdParam, route } from "@/lib/api/handler";
import { paginated } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import {
  buildSort,
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  parseQuery,
  routeObjectId,
  skipFor,
} from "@/lib/validations/common";
import { distributionListQuerySchema } from "@/lib/validations/distribution";
import Distribution from "@/models/Distribution";
import School from "@/models/School";

const SORTABLE = [
  "scheduledAt",
  "dispatchedAt",
  "receivedAt",
  "createdAt",
] as const;

/** Delivery history for one school (PRD 8.7). */
export const GET = route<IdParam>(async (request, { params }) => {
  const user = await requireUser();
  const schoolId = await routeObjectId(params);

  if (
    user.role === "school_operator" &&
    !user.organizationId?.equals(schoolId)
  ) {
    throw forbidden("You may only access your own school's distributions");
  }
  // An SPPG operator sees only the legs they themselves sent to this school.
  const senderScope =
    user.role === "sppg_operator" ? { sppgId: user.organizationId } : {};

  const exists = await School.exists({ _id: schoolId }).exec();
  if (!exists) throw notFound("School not found");

  const query = parseQuery(request, distributionListQuerySchema);

  const filter = mergeFilters(
    { schoolId },
    senderScope,
    query.status ? { status: query.status } : {},
    query.batchId ? { batchId: query.batchId } : {},
    dateRangeFilter("scheduledAt", query.from, query.to),
  );

  const [items, total] = await Promise.all([
    Distribution.find(filter)
      .populate("batchId", "batchCode menuName productionDate status")
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "scheduledAt"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Distribution.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});
