import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RiskOverview } from "@/components/risk-analysis/risk-overview";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDashboardRiskOverview } from "@/services/dashboard.service";
import { listRecentRiskAssessments } from "@/services/risk-assessment.service";

export const metadata: Metadata = { title: "Analisis Risiko — AMANGIZ" };

// PRD §3.2: Risk Assessment has no access row for School Operator.
async function RiskAnalysisGate() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  if (actor.role === "school_operator") redirect("/app/dashboard");

  const [overview, assessmentHistory] = await Promise.all([
    getDashboardRiskOverview(actor, 10),
    listRecentRiskAssessments(actor, 15),
  ]);

  return (
    <RiskOverview
      overview={{
        byLevel: overview.byLevel,
        unassessedIncidents: overview.unassessedIncidents,
        topCases: overview.topCases.map((item) => ({
          _id: String(item._id),
          incidentCode: item.incidentCode,
          title: item.title,
          status: item.status,
          latestRisk: {
            score: item.latestRisk.score,
            level: item.latestRisk.level,
            missingData: item.latestRisk.missingData,
            recommendations: item.latestRisk.recommendations ?? [],
          },
        })),
        mostTriggeredRules: overview.mostTriggeredRules.map((rule) => ({
          ruleCode: rule._id,
          ruleName: rule.ruleName,
          count: rule.count,
        })),
        assessmentHistory: assessmentHistory.map((entry) => ({
          _id: String(entry._id),
          incidentId: String(entry.incidentId),
          incidentCode: entry.incidentCode,
          incidentTitle: entry.incidentTitle,
          score: entry.score,
          level: entry.level,
          assessedAt: new Date(entry.assessedAt).toISOString(),
          assessorName: entry.assessorName,
        })),
        engineVersion: overview.engineVersion,
        disclaimer: overview.disclaimer,
      }}
    />
  );
}

export default function RiskAnalysisPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Analisis Risiko
        </h1>
        <p className="text-sm text-text-secondary">
          Ringkasan prioritas dan faktor risiko dari seluruh insiden.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RiskAnalysisGate />
      </Suspense>
    </div>
  );
}
