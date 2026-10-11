import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InvestigationFilters } from "@/components/investigations/investigation-filters";
import { InvestigationsTable } from "@/components/investigations/investigations-table";
import {
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { investigationListQuerySchema } from "@/lib/validations/investigation";
import { listInvestigations } from "@/services/investigation.service";

export const metadata: Metadata = { title: "Investigasi — AMANGIZ" };

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function InvestigationsList({
  status,
  rootCauseStatus,
}: {
  status?: string;
  rootCauseStatus?: string;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  // PRD §3.2: Investigation is Admin full / Investigator assigned-or-full only.
  if (actor.role !== "admin" && actor.role !== "investigator") {
    redirect("/app/dashboard");
  }

  const query = investigationListQuerySchema.parse({
    status,
    rootCauseStatus,
    limit: 100,
  });
  const { data } = await listInvestigations(actor, query);

  return (
    <InvestigationsTable
      initialData={data.map((investigation) => {
        const incident = populatedRef<{
          incidentCode: string;
          title: string;
          status: string;
        }>(investigation.incidentId, ["incidentCode", "title", "status"]);
        const assignedTo = populatedRef<{ name: string }>(
          investigation.assignedTo,
          ["name"],
        );
        return {
          _id: String(investigation._id),
          status: investigation.status,
          rootCauseStatus: investigation.rootCauseStatus,
          createdAt: new Date(investigation.createdAt).toISOString(),
          incident: incident
            ? {
                incidentCode: incident.incidentCode,
                title: incident.title,
                status: incident.status,
              }
            : null,
          assignedTo: assignedTo ? { name: assignedTo.name } : null,
        };
      })}
    />
  );
}

// See the note in app/(application)/app/batches/page.tsx for why `searchParams`
// is awaited inside a Suspense boundary rather than in the page component.
async function InvestigationsSection({
  searchParams,
}: {
  searchParams: PageProps<"/app/investigations">["searchParams"];
}) {
  const params = await searchParams;
  const status = param(params.status);
  const rootCauseStatus = param(params.rootCauseStatus);

  return (
    <>
      <InvestigationFilters defaults={{ status, rootCauseStatus }} />
      <Suspense
        key={`${status}-${rootCauseStatus}`}
        fallback={<TableSkeleton columns={5} />}
      >
        <InvestigationsList status={status} rootCauseStatus={rootCauseStatus} />
      </Suspense>
    </>
  );
}

export default function InvestigationsPage({
  searchParams,
}: PageProps<"/app/investigations">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Investigasi</h1>
        <p className="text-sm text-text-secondary">
          Antrean investigasi dan tindak lanjut insiden.
        </p>
      </div>
      <Suspense
        fallback={
          <>
            <FilterBarSkeleton fields={2} />
            <TableSkeleton columns={5} />
          </>
        }
      >
        <InvestigationsSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
