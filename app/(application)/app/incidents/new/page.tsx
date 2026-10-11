import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { IncidentReportForm } from "@/components/incidents/incident-report-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Lapor Insiden — AMANGIZ" };

// PRD §8.10: every role may report an incident — school operators are
// auto-scoped to their own school server-side regardless of what's submitted,
// so there is nothing role-specific to gate here.
async function NewIncidentGate() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  return <IncidentReportForm />;
}

export default function NewIncidentPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lapor Insiden</h1>
        <p className="text-sm text-muted">
          Catat dugaan insiden keamanan pangan beserta kronologinya.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewIncidentGate />
      </Suspense>
    </div>
  );
}
