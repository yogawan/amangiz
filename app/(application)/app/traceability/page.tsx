import type { Types } from "mongoose";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBarSkeleton } from "@/components/shared/skeletons";
import { TraceabilityChain } from "@/components/traceability/traceability-chain";
import { TraceabilitySearch } from "@/components/traceability/traceability-search";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { getTraceabilityByBatchCode } from "@/services/traceability.service";

export const metadata: Metadata = { title: "Traceability - AMANGIZ" };

interface TraceBatch {
  _id: Types.ObjectId;
  batchCode: string;
  menuName: string;
  productionDate: Date;
  status: string;
}

async function TraceabilityResultGate({ code }: { code: string }) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const result = await getTraceabilityByBatchCode(actor, code).catch(
    (error) => {
      if (error instanceof ApiError && error.status === 403) {
        return "forbidden" as const;
      }
      throw error;
    },
  );

  if (result === "forbidden") {
    return (
      <EmptyState
        title="Tidak memiliki akses"
        description={`Anda tidak memiliki akses untuk menelusuri batch "${code}".`}
      />
    );
  }
  if (!result) {
    return (
      <EmptyState
        title="Batch tidak ditemukan"
        description={`Tidak ada batch dengan kode "${code}".`}
      />
    );
  }

  const batch = result.batch as TraceBatch;
  const sppg = populatedRef<{ code: string; name: string }>(result.sppg, [
    "code",
    "name",
  ]);

  return (
    <TraceabilityChain
      trace={{
        batch: {
          _id: String(batch._id),
          batchCode: batch.batchCode,
          menuName: batch.menuName,
          productionDate: new Date(batch.productionDate).toISOString(),
          status: batch.status,
        },
        sppg: sppg
          ? { _id: String(sppg._id), code: sppg.code, name: sppg.name }
          : null,
        suppliers: result.suppliers.map((item) => {
          const supplier = populatedRef<{ code: string; name: string }>(
            item.supplier,
            ["code", "name"],
          );
          return {
            supplier: supplier
              ? {
                  _id: String(supplier._id),
                  code: supplier.code,
                  name: supplier.name,
                }
              : null,
            ingredientName: item.ingredientName,
            quantity: item.quantity,
            unit: item.unit,
          };
        }),
        distributions: result.distributions.map((leg) => {
          const school = populatedRef<{ code: string; name: string }>(
            leg.school,
            ["code", "name"],
          );
          return {
            id: String(leg.id),
            distributionCode: leg.distributionCode,
            school: school
              ? {
                  _id: String(school._id),
                  code: school.code,
                  name: school.name,
                }
              : null,
            quantity: leg.quantity,
            unit: leg.unit,
            status: leg.status,
            scheduledAt: leg.scheduledAt
              ? new Date(leg.scheduledAt).toISOString()
              : undefined,
            dispatchedAt: leg.dispatchedAt
              ? new Date(leg.dispatchedAt).toISOString()
              : undefined,
            receivedAt: leg.receivedAt
              ? new Date(leg.receivedAt).toISOString()
              : undefined,
            receiptConfirmed: leg.receiptConfirmed,
            deliveryEvidence: leg.deliveryEvidence.map((evidence) => ({
              url: evidence.url,
              publicId: evidence.publicId,
            })),
          };
        }),
        relatedIncidents: (
          result.relatedIncidents as Array<{
            _id: Types.ObjectId;
            incidentCode: string;
            title: string;
            status: string;
            severity: string;
            reportedAt: Date;
            schoolId: unknown;
          }>
        ).map((incident) => {
          const school = populatedRef<{ code: string; name: string }>(
            incident.schoolId,
            ["code", "name"],
          );
          return {
            _id: String(incident._id),
            incidentCode: incident.incidentCode,
            title: incident.title,
            status: incident.status,
            severity: incident.severity,
            reportedAt: new Date(incident.reportedAt).toISOString(),
            school: school
              ? {
                  _id: String(school._id),
                  code: school.code,
                  name: school.name,
                }
              : null,
          };
        }),
        summary: {
          totalDistributions: result.summary.totalDistributions,
          confirmedReceipts: result.summary.confirmedReceipts,
          pendingReceipts: result.summary.pendingReceipts,
          schoolsReached: result.summary.schoolsReached,
          relatedIncidentCount: result.summary.relatedIncidentCount,
        },
      }}
    />
  );
}

// See the note in app/(application)/app/batches/page.tsx for why `searchParams`
// is awaited inside a Suspense boundary rather than in the page component.
async function TraceabilitySection({
  searchParams,
}: {
  searchParams: PageProps<"/app/traceability">["searchParams"];
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : undefined;

  return (
    <>
      <TraceabilitySearch defaultCode={code} />
      {code ? (
        <Suspense key={code} fallback={<Skeleton className="h-96 w-full" />}>
          <TraceabilityResultGate code={code} />
        </Suspense>
      ) : (
        <EmptyState
          title="Masukkan kode batch"
          description="Cari kode batch untuk melihat jalur distribusinya."
        />
      )}
    </>
  );
}

export default function TraceabilityPage({
  searchParams,
}: PageProps<"/app/traceability">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Traceability</h1>
        <p className="text-sm text-muted">
          Telusuri jalur batch dari pemasok hingga penerima.
        </p>
      </div>
      <Suspense
        fallback={
          <>
            <FilterBarSkeleton fields={1} />
            <Skeleton className="h-96 w-full" />
          </>
        }
      >
        <TraceabilitySection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
