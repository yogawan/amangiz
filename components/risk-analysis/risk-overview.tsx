import Link from "next/link";
import { RiskDistributionChart } from "@/components/risk-analysis/risk-distribution-chart";
import { RiskBadge, type RiskLevel } from "@/components/shared/risk-badge";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RiskOverviewData {
  byLevel: { low: number; medium: number; high: number; critical: number };
  unassessedIncidents: number;
  topCases: {
    _id: string;
    incidentCode: string;
    title: string;
    status: string;
    latestRisk: {
      score: number;
      level: string;
      missingData: string[];
      recommendations: string[];
    };
  }[];
  mostTriggeredRules: { ruleCode: string; ruleName: string; count: number }[];
  assessmentHistory: {
    _id: string;
    incidentId: string;
    incidentCode: string;
    incidentTitle: string;
    score: number;
    level: string;
    assessedAt: string;
    assessorName: string | null;
  }[];
  engineVersion: string;
  disclaimer: string;
}

export function RiskOverview({ overview }: { overview: RiskOverviewData }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm leading-6 text-amber-900">
        {overview.disclaimer}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Low" value={overview.byLevel.low} />
        <StatCard
          label="Medium"
          value={overview.byLevel.medium}
          tone="warning"
        />
        <StatCard label="High" value={overview.byLevel.high} tone="warning" />
        <StatCard
          label="Critical"
          value={overview.byLevel.critical}
          tone="danger"
        />
      </div>
      {overview.unassessedIncidents > 0 && (
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">
            {overview.unassessedIncidents}
          </span>{" "}
          insiden belum dinilai risikonya.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Distribusi Tingkat Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskDistributionChart byLevel={overview.byLevel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kasus Prioritas Tertinggi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {overview.topCases.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Belum ada kasus yang dinilai.
            </p>
          ) : (
            overview.topCases.map((item) => (
              <div
                key={item._id}
                className="rounded-lg border border-border transition-colors hover:border-primary/40"
              >
                <Link
                  href={`/app/incidents/${item._id}`}
                  className="flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <div>
                    <p className="font-mono text-xs text-text-secondary">
                      {item.incidentCode}
                    </p>
                    <p className="font-medium text-text-primary">
                      {item.title}
                    </p>
                    {item.latestRisk.missingData.length > 0 && (
                      <p className="mt-1 text-xs text-text-muted">
                        Data kurang: {item.latestRisk.missingData.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={item.latestRisk.level as RiskLevel} />
                    <span className="font-mono text-xs text-text-secondary">
                      Skor {item.latestRisk.score}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </Link>
                {item.latestRisk.recommendations.length > 0 && (
                  <div className="border-t border-border px-3 py-2">
                    <p className="text-xs font-semibold text-text-secondary">
                      Tindakan yang disarankan
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-text-secondary">
                      {item.latestRisk.recommendations.map((recommendation) => (
                        <li key={recommendation}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aturan Paling Sering Terpenuhi</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.mostTriggeredRules.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Belum ada aturan yang terpenuhi.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overview.mostTriggeredRules.map((rule) => (
                <li
                  key={rule.ruleCode}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-primary">{rule.ruleName}</span>
                  <span className="font-mono text-xs text-text-secondary">
                    {rule.count}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penilaian</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.assessmentHistory.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Belum ada penilaian risiko yang dijalankan.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overview.assessmentHistory.map((entry) => (
                <li key={entry._id}>
                  <Link
                    href={`/app/incidents/${entry.incidentId}`}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0 hover:text-primary"
                  >
                    <div>
                      <p className="font-mono text-xs text-text-secondary">
                        {entry.incidentCode}
                      </p>
                      <p className="text-text-primary">{entry.incidentTitle}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(entry.assessedAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {entry.assessorName ? ` · ${entry.assessorName}` : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={entry.level as RiskLevel} />
                      <span className="font-mono text-xs text-text-secondary">
                        Skor {entry.score}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-text-muted">
        Risk engine version: {overview.engineVersion}
      </p>
    </div>
  );
}
