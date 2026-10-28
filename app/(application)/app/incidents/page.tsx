import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { IncidentFilters } from "@/components/incidents/incident-filters";
import { IncidentsTable } from "@/components/incidents/incidents-table";
import {
  CardSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";
import { StatCard } from "@/components/shared/stat-card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { incidentListQuerySchema } from "@/lib/validations/incident";
import { getDashboardSummary } from "@/services/dashboard.service";
import { listIncidents } from "@/services/incident.service";

export const metadata: Metadata = { title: "Insiden - AMANGIZ" };

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function IncidentsList({
  search,
  status,
  severity,
  from,
  to,
}: {
  search?: string;
  status?: string;
  severity?: string;
  from?: string;
  to?: string;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const query = incidentListQuerySchema.parse({
    search,
    status,
    severity,
    from,
    to,
    limit: 100,
  });
  const { data } = await listIncidents(actor, query);

  return (
    <IncidentsTable
      initialData={data.map((incident) => {
        const batch = populatedRef<{ batchCode: string }>(incident.batchId, [
          "batchCode",
        ]);
        const school = populatedRef<{ code: string; name: string }>(
          incident.schoolId,
          ["code", "name"],
        );
        return {
          _id: String(incident._id),
          incidentCode: incident.incidentCode,
          title: incident.title,
          incidentType: incident.incidentType,
          severity: incident.severity,
          status: incident.status,
          reportedAt: new Date(incident.reportedAt).toISOString(),
          reportedAffectedCount: incident.reportedAffectedCount,
          batch: batch ? { batchCode: batch.batchCode } : null,
          school: school ? { code: school.code, name: school.name } : null,
        };
      })}
    />
  );
}

async function IncidentsStats() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const { incidents } = await getDashboardSummary(actor);
  const severityHigh = incidents.bySeverity.high ?? 0;
  const severityCritical = incidents.bySeverity.critical ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Total Insiden"
        value={incidents.total}
        image="/Laporan.png"
      />
      <StatCard
        label="Terbuka"
        value={incidents.open}
        image="/Laporan.png"
        tone={incidents.open > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Severity Tinggi"
        value={severityHigh}
        image="/Laporan.png"
        tone={severityHigh > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Severity Kritis"
        value={severityCritical}
        image="/Laporan.png"
        tone={severityCritical > 0 ? "danger" : "default"}
      />
    </div>
  );
}

// See the note in app/(application)/app/batches/page.tsx for why `searchParams`
// is awaited inside a Suspense boundary rather than in the page component.
async function IncidentsSection({
  searchParams,
}: {
  searchParams: PageProps<"/app/incidents">["searchParams"];
}) {
  const params = await searchParams;
  const search = param(params.search);
  const status = param(params.status);
  const severity = param(params.severity);
  const from = param(params.from);
  const to = param(params.to);

  return (
    <>
      <IncidentFilters defaults={{ search, status, severity, from, to }} />
      <Suspense
        key={`${search}-${status}-${severity}-${from}-${to}`}
        fallback={<TableSkeleton columns={5} />}
      >
        <IncidentsList
          search={search}
          status={status}
          severity={severity}
          from={from}
          to={to}
        />
      </Suspense>
    </>
  );
}

export default function IncidentsPage({
  searchParams,
}: PageProps<"/app/incidents">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Insiden</h1>
        <p className="text-sm text-muted">
          Kelola laporan dugaan insiden keamanan pangan.
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
        <IncidentsStats />
      </Suspense>
      <Suspense
        fallback={
          <>
            <FilterBarSkeleton fields={5} />
            <TableSkeleton columns={5} />
          </>
        }
      >
        <IncidentsSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
