import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuditLogFilters } from "@/components/audit-log/audit-log-filters";
import { AuditLogTable } from "@/components/audit-log/audit-log-table";
import {
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";
import { getCurrentUser } from "@/lib/auth/current-user";
import { populatedRef } from "@/lib/mongo-ref";
import { auditLogListQuerySchema } from "@/lib/validations/audit-log";
import { listAuditLogs } from "@/services/audit-log.service";

export const metadata: Metadata = { title: "Audit Log — AMANGIZ" };

function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function AuditLogList({
  action,
  resourceType,
  from,
  to,
}: {
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  // PRD §3.2: Audit Log has no access row for sppg_operator/school_operator.
  if (actor.role !== "admin" && actor.role !== "investigator") {
    redirect("/app/dashboard");
  }

  // Free-text fields can't go through the route's strict parseQuery — a
  // too-short filter should be dropped, not crash the page.
  const parsed = auditLogListQuerySchema.safeParse({
    action,
    resourceType,
    from,
    to,
    limit: 100,
  });
  const query = parsed.success
    ? parsed.data
    : auditLogListQuerySchema.parse({ limit: 100 });

  const { data } = await listAuditLogs(actor, query);

  return (
    <AuditLogTable
      data={data.map((entry) => {
        const actorRef = populatedRef<{ name: string }>(entry.actorId, [
          "name",
        ]);
        return {
          _id: String(entry._id),
          actorName: actorRef?.name ?? null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: String(entry.resourceId),
          changeCount: entry.changes?.length ?? 0,
          createdAt: new Date(entry.createdAt).toISOString(),
        };
      })}
    />
  );
}

// See the note in app/(application)/app/batches/page.tsx for why `searchParams`
// is awaited inside a Suspense boundary rather than in the page component.
async function AuditLogSection({
  searchParams,
}: {
  searchParams: PageProps<"/app/audit-log">["searchParams"];
}) {
  const params = await searchParams;
  const action = param(params.action);
  const resourceType = param(params.resourceType);
  const from = param(params.from);
  const to = param(params.to);

  return (
    <>
      <AuditLogFilters defaults={{ action, resourceType, from, to }} />
      <Suspense
        key={`${action}-${resourceType}-${from}-${to}`}
        fallback={<TableSkeleton columns={5} />}
      >
        <AuditLogList
          action={action}
          resourceType={resourceType}
          from={from}
          to={to}
        />
      </Suspense>
    </>
  );
}

export default function AuditLogPage({
  searchParams,
}: PageProps<"/app/audit-log">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted">
          Riwayat aktivitas penting yang tercatat di sistem.
        </p>
      </div>
      <Suspense
        fallback={
          <>
            <FilterBarSkeleton />
            <TableSkeleton columns={5} />
          </>
        }
      >
        <AuditLogSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
