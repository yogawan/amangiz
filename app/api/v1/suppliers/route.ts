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
  createSupplierSchema,
  supplierListQuerySchema,
} from "@/lib/validations/master-data";
import Supplier from "@/models/Supplier";

const SORTABLE = [
  "code",
  "name",
  "supplierType",
  "verificationStatus",
  "createdAt",
] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  assertCanReadMasterData(user);

  const query = parseQuery(request, supplierListQuerySchema);

  const filter = mergeFilters(
    searchFilter(query.search, ["code", "name", "contactName"]),
    query.status ? { status: query.status } : {},
    query.supplierType ? { supplierType: query.supplierType } : {},
    query.verificationStatus
      ? { verificationStatus: query.verificationStatus }
      : {},
  );

  const [items, total] = await Promise.all([
    Supplier.find(filter)
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "name"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Supplier.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  assertCanWriteMasterData(actor);

  const input = createSupplierSchema.parse(await readJson(request));

  const taken = await Supplier.exists({ code: input.code }).exec();
  if (taken) {
    throw conflict(`A supplier with code "${input.code}" already exists`);
  }

  // verificationStatus is intentionally not accepted here: it starts at
  // "pending" and only moves through the dedicated verification endpoint,
  // because PRD 7.5 requires it to reflect a real verification process.
  const supplier = await Supplier.create(input);

  await recordAudit({
    actorId: actor.id,
    action: "supplier.create",
    resourceType: "Supplier",
    resourceId: supplier._id,
    metadata: { code: supplier.code, supplierType: supplier.supplierType },
  });

  return created(supplier);
});
