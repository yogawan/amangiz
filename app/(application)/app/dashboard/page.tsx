import {
  AlertTriangle,
  FileSearch,
  Package,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  type DashboardActivityRow,
  DashboardView,
  type QuickAction,
} from "@/components/dashboard/dashboard-view";
import { ROLE_LABELS } from "@/components/layout/nav-items";
import { CardSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { AuthUser } from "@/lib/auth/guard";
import { populatedRef } from "@/lib/mongo-ref";
import { auditLogListQuerySchema } from "@/lib/validations/audit-log";
import type { UserRole } from "@/models/User";
import { listAuditLogs } from "@/services/audit-log.service";
import {
  getDashboardDistributions,
  getDashboardIncidents,
  getDashboardSummary,
} from "@/services/dashboard.service";

export const metadata: Metadata = {
  title: "Dashboard — AMANGIZ",
};

function quickActionsFor(role: UserRole): QuickAction[] {
  switch (role) {
    case "admin":
      return [
        { label: "Tambah Batch", href: "/app/batches/new", icon: Package },
        {
          label: "Buat Distribusi",
          href: "/app/distribution/new",
          icon: Truck,
        },
        {
          label: "Lapor Insiden",
          href: "/app/incidents/new",
          icon: AlertTriangle,
        },
        { label: "Kelola Pengguna", href: "/app/users", icon: Users },
      ];
    case "sppg_operator":
      return [
        { label: "Tambah Batch", href: "/app/batches/new", icon: Package },
        {
          label: "Buat Distribusi",
          href: "/app/distribution/new",
          icon: Truck,
        },
        {
          label: "Lapor Insiden",
          href: "/app/incidents/new",
          icon: AlertTriangle,
        },
      ];
    case "investigator":
      return [
        {
          label: "Lihat Investigasi",
          href: "/app/investigations",
          icon: FileSearch,
        },
        {
          label: "Analisis Risiko",
          href: "/app/risk-analysis",
          icon: ShieldAlert,
        },
        {
          label: "Lapor Insiden",
          href: "/app/incidents/new",
          icon: AlertTriangle,
        },
      ];
    case "school_operator":
      return [
        {
          label: "Lapor Insiden",
          href: "/app/incidents/new",
          icon: AlertTriangle,
        },
      ];
    default:
      return [];
  }
}

/** Audit Log has no access row for sppg_operator/school_operator (PRD §3.2) — stricter than auditLogScope alone. */
async function loadRecentActivity(
  actor: AuthUser,
): Promise<DashboardActivityRow[] | null> {
  if (actor.role !== "admin" && actor.role !== "investigator") return null;

  const query = auditLogListQuerySchema.parse({ limit: 8 });
  // Recent activity is a secondary card. If the audit read is refused for a
  // reason the role check above didn't anticipate, drop the card rather than
  // letting a throw take down the entire dashboard.
  const result = await listAuditLogs(actor, query).catch((error) => {
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  });
  if (!result) return null;
  const { data } = result;

  return data.map((entry) => {
    const actorRef = populatedRef<{ name: string }>(entry.actorId, ["name"]);
    return {
      _id: String(entry._id),
      actor: actorRef ? { name: actorRef.name } : null,
      action: entry.action,
      resourceType: entry.resourceType,
      createdAt: new Date(entry.createdAt).toISOString(),
    };
  });
}

async function DashboardGate() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const [summary, incidents, distributions, recentActivity] = await Promise.all(
    [
      getDashboardSummary(actor),
      getDashboardIncidents(actor, 5),
      getDashboardDistributions(actor, 5),
      loadRecentActivity(actor),
    ],
  );

  return (
    <DashboardView
      summary={summary}
      recentIncidents={incidents.recent.map((incident) => {
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
          school: school ? { code: school.code, name: school.name } : null,
        };
      })}
      overdueDistributions={distributions.overdue.map((distribution) => {
        const school = populatedRef<{ code: string; name: string }>(
          distribution.schoolId,
          ["code", "name"],
        );
        return {
          _id: String(distribution._id),
          distributionCode: distribution.distributionCode,
          scheduledAt: distribution.scheduledAt
            ? new Date(distribution.scheduledAt).toISOString()
            : null,
          status: distribution.status,
          school: school ? { code: school.code, name: school.name } : null,
        };
      })}
      recentActivity={recentActivity}
      quickActions={quickActionsFor(actor.role)}
    />
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <p className="text-sm text-text-secondary">
      Halo,{" "}
      <span className="font-semibold text-text-primary">
        {user?.name ?? "Pengguna"}
      </span>
      {user ? ` · ${ROLE_LABELS[user.role]}` : null}
    </p>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TableSkeleton columns={2} />
        <TableSkeleton columns={2} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <Suspense fallback={<Skeleton className="h-5 w-56" />}>
          <Greeting />
        </Suspense>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardGate />
      </Suspense>
    </div>
  );
}
