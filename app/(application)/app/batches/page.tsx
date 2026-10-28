import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BatchFilters } from "@/components/batches/batch-filters";
import { BatchesTable } from "@/components/batches/batches-table";
import {
  CardSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";
import { StatCard } from "@/components/shared/stat-card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { batchListQuerySchema } from "@/lib/validations/batch";
import { listBatches } from "@/services/batch.service";
import { getDashboardSummary } from "@/services/dashboard.service";

export const metadata: Metadata = { title: "Batch Makanan - AMANGIZ" };

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

type BatchesSearchParams = PageProps<"/app/batches">["searchParams"];

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

async function BatchesStats() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const { batches } = await getDashboardSummary(actor);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Batch" value={batches.total} image="/Batch.png" />
      <StatCard label="Batch Aktif" value={batches.active} image="/Batch.png" />
      <StatCard
        label="On Hold"
        value={batches.onHold}
        image="/Batch.png"
        tone={batches.onHold > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Recalled"
        value={batches.recalled}
        image="/Batch.png"
        tone={batches.recalled > 0 ? "danger" : "default"}
      />
    </div>
  );
}

/**
 * `searchParams` is unknowable at build time, so it can only be awaited inside
 * a Suspense boundary (`cacheComponents: true` fails the build otherwise). The
 * filter bar is awaited here rather than in `BatchesList` so it paints as soon
 * as the request's params are known instead of waiting on the query, and the
 * inner boundary keeps its `key` so changing a filter re-shows the skeleton.
 */
async function BatchesSection({
  searchParams,
}: {
  searchParams: BatchesSearchParams;
}) {
  const params = await searchParams;
  const search = param(params.search);
  const status = param(params.status);
  const from = param(params.from);
  const to = param(params.to);

  return (
    <>
      <BatchFilters defaults={{ search, status, from, to }} />
      <Suspense
        key={`${search}-${status}-${from}-${to}`}
        fallback={<TableSkeleton columns={5} />}
      >
        <BatchesList search={search} status={status} from={from} to={to} />
      </Suspense>
    </>
  );
}

export default function BatchesPage({
  searchParams,
}: PageProps<"/app/batches">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Batch Makanan</h1>
        <p className="text-sm text-muted">
          Kelola batch produksi dan status distribusinya.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        }
      >
        <BatchesStats />
      </Suspense>
      <Suspense
        fallback={
          <>
            <FilterBarSkeleton />
            <TableSkeleton columns={5} />
          </>
        }
      >
        <BatchesSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
