import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DistributionFilters } from "@/components/distribution/distribution-filters";
import { DistributionsTable } from "@/components/distribution/distributions-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { distributionListQuerySchema } from "@/lib/validations/distribution";
import { listDistributions } from "@/services/distribution.service";

export const metadata: Metadata = { title: "Distribusi — AMANGIZ" };

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function DistributionsList({
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

  const query = distributionListQuerySchema.parse({
    search,
    status,
    from,
    to,
    limit: 100,
  });
  const { data } = await listDistributions(actor, query);

  return (
    <DistributionsTable
      initialData={data.map((distribution) => {
        const batch = populatedRef<{ batchCode: string; menuName: string }>(
          distribution.batchId,
          ["batchCode", "menuName"],
        );
        const school = populatedRef<{ code: string; name: string }>(
          distribution.schoolId,
          ["code", "name"],
        );
        return {
          _id: String(distribution._id),
          distributionCode: distribution.distributionCode,
          batch: batch
            ? {
                _id: String(batch._id),
                batchCode: batch.batchCode,
                menuName: batch.menuName,
              }
            : null,
          school: school
            ? { _id: String(school._id), code: school.code, name: school.name }
            : null,
          quantity: distribution.quantity,
          unit: distribution.unit,
          scheduledAt: distribution.scheduledAt
            ? new Date(distribution.scheduledAt).toISOString()
            : undefined,
          status: distribution.status,
        };
      })}
      canCreate={actor.role === "admin" || actor.role === "sppg_operator"}
    />
  );
}

export default async function DistributionPage({
  searchParams,
}: PageProps<"/app/distribution">) {
  const params = await searchParams;
  const search = param(params.search);
  const status = param(params.status);
  const from = param(params.from);
  const to = param(params.to);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Distribusi</h1>
        <p className="text-sm text-text-secondary">
          Pantau pengiriman batch ke sekolah penerima.
        </p>
      </div>
      <DistributionFilters defaults={{ search, status, from, to }} />
      <Suspense
        key={`${search}-${status}-${from}-${to}`}
        fallback={<TableSkeleton columns={6} />}
      >
        <DistributionsList
          search={search}
          status={status}
          from={from}
          to={to}
        />
      </Suspense>
    </div>
  );
}
