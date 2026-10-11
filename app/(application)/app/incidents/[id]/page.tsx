import type { Types } from "mongoose";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { IncidentDetail } from "@/components/incidents/incident-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/current-user";
import { idOf, populatedRef } from "@/lib/mongo-ref";
import { toObjectId } from "@/lib/validations/common";
import { getIncidentById } from "@/services/incident.service";

export const metadata: Metadata = { title: "Detail Insiden — AMANGIZ" };

const RESOLVABLE_STATUSES = new Set([
  "triaged",
  "containment_in_progress",
  "under_investigation",
]);

function parseId(id: string): Types.ObjectId | null {
  try {
    return toObjectId(id);
  } catch {
    return null;
  }
}

async function IncidentDetailGate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const objectId = parseId(id);
  if (!objectId) notFound();

  const result = await getIncidentById(actor, objectId).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) {
      redirect("/app/incidents");
    }
    throw error;
  });
  const { report, latestRiskAssessment, investigation } = result;
  if (!report) notFound();

  const reportedBy = populatedRef<{ name: string; role: string }>(
    report.reportedBy,
    ["name", "role"],
  );
  const batch = populatedRef<{ batchCode: string; menuName: string }>(
    report.batchId,
    ["batchCode", "menuName"],
  );
  const distribution = populatedRef<{ distributionCode: string }>(
    report.distributionId,
    ["distributionCode"],
  );
  const school = populatedRef<{ code: string; name: string }>(report.schoolId, [
    "code",
    "name",
  ]);
  const investigationAssignedTo = investigation
    ? populatedRef<{ name: string }>(investigation.assignedTo, ["name"])
    : null;

  const isStaff = actor.role === "admin" || actor.role === "investigator";
  const isAssignedOrAdmin =
    actor.role === "admin" ||
    !report.assignedInvestigatorId ||
    idOf(report.assignedInvestigatorId) === String(actor.id);

  return (
    <IncidentDetail
      incident={{
        _id: String(report._id),
        incidentCode: report.incidentCode,
        title: report.title,
        description: report.description,
        incidentType: report.incidentType,
        status: report.status,
        severity: report.severity,
        occurredAt: report.occurredAt
          ? new Date(report.occurredAt).toISOString()
          : undefined,
        reportedAt: new Date(report.reportedAt).toISOString(),
        reportedAffectedCount: report.reportedAffectedCount,
        symptomsReported: report.symptomsReported,
        reportedBy: reportedBy
          ? { name: reportedBy.name, role: reportedBy.role }
          : null,
        batch: batch
          ? { batchCode: batch.batchCode, menuName: batch.menuName }
          : null,
        distribution: distribution
          ? { distributionCode: distribution.distributionCode }
          : null,
        school: school ? { code: school.code, name: school.name } : null,
        evidence: report.evidence.map((item) => ({
          url: item.url,
          publicId: item.publicId,
          fileType: item.fileType,
          description: item.description,
        })),
      }}
      riskAssessment={
        latestRiskAssessment
          ? {
              score: latestRiskAssessment.score,
              level: latestRiskAssessment.level,
              rulesTriggered: latestRiskAssessment.rulesTriggered,
              missingData: latestRiskAssessment.missingData,
              recommendations: latestRiskAssessment.recommendations,
              engineVersion: latestRiskAssessment.engineVersion,
              assessedAt: new Date(
                latestRiskAssessment.assessedAt,
              ).toISOString(),
            }
          : null
      }
      investigation={
        investigation
          ? {
              _id: String(investigation._id),
              status: investigation.status,
              assignedTo: investigationAssignedTo
                ? { name: investigationAssignedTo.name }
                : null,
              rootCauseStatus: investigation.rootCauseStatus,
            }
          : null
      }
      permissions={{
        actorRole: actor.role,
        actorId: String(actor.id),
        canAssign: isStaff && report.status !== "closed",
        canTriage: isStaff,
        canRunRiskAssessment: isStaff,
        canResolve:
          isStaff &&
          isAssignedOrAdmin &&
          RESOLVABLE_STATUSES.has(report.status),
        canClose: isStaff && report.status === "resolved",
        canUploadEvidence: report.status !== "closed",
      }}
    />
  );
}

export default function IncidentDetailPage({
  params,
}: PageProps<"/app/incidents/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <IncidentDetailGate params={params} />
    </Suspense>
  );
}
