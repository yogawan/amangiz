import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BatchFilters } from "@/components/batches/batch-filters";
import { BatchesTable } from "@/components/batches/batches-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { batchListQuerySchema } from "@/lib/validations/batch";
import { listBatches } from "@/services/batch.service";

export const metadata: Metadata = { title: "Batch Makanan — AMANGIZ" };

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function BatchesList({
  search,
  status,
  from,
  to,
}: {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const query = batchListQuerySchema.parse({
    search,
    status,
    from,
    to,
    limit: 100,
  });
  const { data } = await listBatches(actor, query);

  return (
    <BatchesTable
      initialData={data.map((batch) => {
        const sppg = populatedRef<{ code: string; name: string }>(
          batch.sppgId,
          ["code", "name"],
        );
        return {
          _id: String(batch._id),
          batchCode: batch.batchCode,
          menuName: batch.menuName,
          productionDate: new Date(batch.productionDate).toISOString(),
          status: batch.status,
          sppg: sppg
            ? { _id: String(sppg._id), code: sppg.code, name: sppg.name }
            : null,
        };
      })}
      canCreate={actor.role === "admin" || actor.role === "sppg_operator"}
    />
  );
}

export default async function BatchesPage({
  searchParams,
}: PageProps<"/app/batches">) {
  const params = await searchParams;
  const search = param(params.search);
  const status = param(params.status);
  const from = param(params.from);
  const to = param(params.to);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Batch Makanan
        </h1>
        <p className="text-sm text-text-secondary">
          Kelola batch produksi dan status distribusinya.
        </p>
      </div>
      <BatchFilters defaults={{ search, status, from, to }} />
      <Suspense
        key={`${search}-${status}-${from}-${to}`}
        fallback={<TableSkeleton columns={5} />}
      >
        <BatchesList search={search} status={status} from={from} to={to} />
      </Suspense>
    </div>
  );
}
