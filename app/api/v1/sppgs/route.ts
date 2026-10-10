import { conflict } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import {
  assertCanReadMasterData,
  assertCanWriteMasterData,
} from "@/lib/permissions";
import {
  buildSort,
  mergeFilters,
  paginationMeta,
  parseQuery,
  searchFilter,
  skipFor,
} from "@/lib/validations/common";
import {
  createSppgSchema,
  masterDataListQuerySchema,
} from "@/lib/validations/master-data";
import SPPG from "@/models/SPPG";

const SORTABLE = ["code", "name", "status", "createdAt"] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  assertCanReadMasterData(user);

  const query = parseQuery(request, masterDataListQuerySchema);

  const filter = mergeFilters(
    searchFilter(query.search, ["code", "name", "address.city"]),
    query.status ? { status: query.status } : {},
    query.province ? { "address.province": query.province } : {},
    query.city ? { "address.city": query.city } : {},
  );

  const [items, total] = await Promise.all([
    SPPG.find(filter)
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "name"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    SPPG.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  assertCanWriteMasterData(actor);

  const input = createSppgSchema.parse(await readJson(request));

  const taken = await SPPG.exists({ code: input.code }).exec();
  if (taken) throw conflict(`An SPPG with code "${input.code}" already exists`);

  const sppg = await SPPG.create(input);

  await recordAudit({
    actorId: actor.id,
    action: "sppg.create",
    resourceType: "SPPG",
    resourceId: sppg._id,
    organizationId: sppg._id,
    metadata: { code: sppg.code },
  });

  return created(sppg);
});
