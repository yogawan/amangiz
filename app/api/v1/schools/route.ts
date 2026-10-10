import { conflict } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { assertCanWriteMasterData, isAdmin } from "@/lib/permissions";
import {
  buildSort,
  mergeFilters,
  paginationMeta,
  parseQuery,
  searchFilter,
  skipFor,
} from "@/lib/validations/common";
import {
  createSchoolSchema,
  schoolListQuerySchema,
} from "@/lib/validations/master-data";
import School from "@/models/School";

const SORTABLE = ["code", "name", "level", "createdAt"] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, schoolListQuerySchema);

  // A school operator sees only their own school in this directory.
  const ownScope =
    user.role === "school_operator" && user.organizationId
      ? { _id: user.organizationId }
      : {};

  const filter = mergeFilters(
    ownScope,
    searchFilter(query.search, ["code", "name", "address.city"]),
    query.status ? { status: query.status } : {},
    query.level ? { level: query.level } : {},
  );

  const [items, total] = await Promise.all([
    School.find(filter)
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "name"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    School.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total), {
    scopedToOwnSchool: !isAdmin(user) && user.role === "school_operator",
  });
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  assertCanWriteMasterData(actor);

  const input = createSchoolSchema.parse(await readJson(request));

  const taken = await School.exists({ code: input.code }).exec();
  if (taken) {
    throw conflict(`A school with code "${input.code}" already exists`);
  }

  const school = await School.create(input);

  await recordAudit({
    actorId: actor.id,
    action: "school.create",
    resourceType: "School",
    resourceId: school._id,
    organizationId: school._id,
    metadata: { code: school.code },
  });

  return created(school);
});
