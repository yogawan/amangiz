import {
  AlertTriangle,
  ClipboardList,
  type LucideIcon,
  Package,
  ShieldAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DashboardSummary {
  batches: { total: number; active: number; onHold: number; recalled: number };
  distributions: { today: number; pendingReceipt: number; delayed: number };
  incidents: { total: number; open: number };
  risk: { highPriorityCases: number };
}

export interface DashboardIncidentRow {
  _id: string;
  incidentCode: string;
  title: string;
  status: string;
  severity: string;
  reportedAt: string;
  school: { code: string; name: string } | null;
}

export interface DashboardDistributionRow {
  _id: string;
  distributionCode: string;
  scheduledAt: string | null;
  status: string;
  school: { code: string; name: string } | null;
}

export interface DashboardActivityRow {
  _id: string;
  actor: { name: string } | null;
  action: string;
  resourceType: string;
  createdAt: string;
}

export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function DashboardView({
  summary,
  recentIncidents,
  overdueDistributions,
  recentActivity,
  quickActions,
}: {
  summary: DashboardSummary;
  recentIncidents: DashboardIncidentRow[];
  overdueDistributions: DashboardDistributionRow[];
  recentActivity: DashboardActivityRow[] | null;
  quickActions: QuickAction[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Batch Aktif"
          value={summary.batches.active}
          icon={Package}
          href="/app/batches"
          hint={`${summary.batches.total} total batch`}
        />
        <StatCard
          label="Distribusi Hari Ini"
          value={summary.distributions.today}
          icon={Truck}
          href="/app/distribution"
          hint={`${summary.distributions.delayed} terlambat`}
          tone={summary.distributions.delayed > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Laporan Insiden"
          value={summary.incidents.total}
          icon={AlertTriangle}
          href="/app/incidents"
          hint={`${summary.incidents.open} masih terbuka`}
          tone={summary.incidents.open > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Kasus Prioritas Tinggi"
          value={summary.risk.highPriorityCases}
          icon={ShieldAlert}
          href="/app/risk-analysis"
          hint="Risk level high/critical"
          tone={summary.risk.highPriorityCases > 0 ? "danger" : "default"}
        />
      </div>

      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button key={action.href} asChild variant="outline" size="sm">
              <Link href={action.href}>
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Insiden Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="Belum ada insiden"
                description="Laporan insiden terbaru akan muncul di sini."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {recentIncidents.map((incident) => (
                  <li key={incident._id}>
                    <Link
                      href={`/app/incidents/${incident._id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                    >
                      <div>
                        <p className="font-mono text-xs text-muted">
                          {incident.incidentCode}
                        </p>
                        <p className="font-medium text-foreground">
                          {incident.title}
                        </p>
                        {incident.school && (
                          <p className="text-xs text-muted">
                            {incident.school.name}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={incident.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Terlambat</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueDistributions.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="Tidak ada distribusi terlambat"
                description="Distribusi yang melewati jadwal tanpa dikirim akan muncul di sini."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {overdueDistributions.map((distribution) => (
                  <li key={distribution._id}>
                    <Link
                      href={`/app/distribution/${distribution._id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                    >
                      <div>
                        <p className="font-mono text-xs text-muted">
                          {distribution.distributionCode}
                        </p>
                        {distribution.school && (
                          <p className="font-medium text-foreground">
                            {distribution.school.name}
                          </p>
                        )}
                        {distribution.scheduledAt && (
                          <p className="text-xs text-muted">
                            Jadwal{" "}
                            {new Date(
                              distribution.scheduledAt,
                            ).toLocaleDateString("id-ID", {
                              dateStyle: "medium",
                            })}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={distribution.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {recentActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Belum ada aktivitas"
                description="Aktivitas penting yang tercatat di audit log akan muncul di sini."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {recentActivity.map((entry) => (
                  <li
                    key={entry._id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
                  >
                    <span className="text-foreground">
                      <span className="font-medium">
                        {entry.actor?.name ?? "Sistem"}
                      </span>{" "}
                      <span className="text-muted">{entry.action}</span>{" "}
                      <span className="font-mono text-xs text-muted">
                        {entry.resourceType}
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(entry.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
