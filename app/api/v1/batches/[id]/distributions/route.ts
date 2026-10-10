import { loadBatchForRead } from "@/lib/access";
import { type IdParam, route } from "@/lib/api/handler";
import { paginated } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import {
  buildSort,
  mergeFilters,
  paginationMeta,
  parseQuery,
  routeObjectId,
  skipFor,
} from "@/lib/validations/common";
import { distributionListQuerySchema } from "@/lib/validations/distribution";
import Distribution from "@/models/Distribution";

const SORTABLE = [
  "scheduledAt",
  "dispatchedAt",
  "receivedAt",
  "status",
] as const;

/** Every distribution leg for one batch (PRD 8.8). */
export const GET = route<IdParam>(async (request, { params }) => {
  const user = await requireUser();
  const batchId = await routeObjectId(params);

  await loadBatchForRead(user, batchId);

  const query = parseQuery(request, distributionListQuerySchema);

  // A school operator may only see the legs addressed to their own school.
  const ownScope =
    user.role === "school_operator" ? { schoolId: user.organizationId } : {};

  const filter = mergeFilters(
    { batchId },
    ownScope,
    query.status ? { status: query.status } : {},
    query.schoolId ? { schoolId: query.schoolId } : {},
  );

  const [items, total] = await Promise.all([
    Distribution.find(filter)
      .populate("schoolId", "code name level")
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "scheduledAt"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Distribution.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});
