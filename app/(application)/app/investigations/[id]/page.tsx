import type { Types } from "mongoose";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { InvestigationDetail } from "@/components/investigations/investigation-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/current-user";
import { idOf, populatedRef } from "@/lib/mongo-ref";
import { toObjectId } from "@/lib/validations/common";
import { getInvestigationById } from "@/services/investigation.service";

export const metadata: Metadata = { title: "Detail Investigasi — AMANGIZ" };

function parseId(id: string): Types.ObjectId | null {
  try {
    return toObjectId(id);
  } catch {
    return null;
  }
}

async function InvestigationDetailGate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");

  const objectId = parseId(id);
  if (!objectId) notFound();

  const investigation = await getInvestigationById(actor, objectId).catch(
    (error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      if (error instanceof ApiError && error.status === 403) {
        redirect("/app/investigations");
      }
      throw error;
    },
  );
  if (!investigation) notFound();

  const incident = populatedRef<{
    incidentCode: string;
    title: string;
  }>(investigation.incidentId, ["incidentCode", "title"]);

  const isAdmin = actor.role === "admin";
  const isAssigned = idOf(investigation.assignedTo) === String(actor.id);
  const canEdit =
    (isAdmin || isAssigned) && investigation.status !== "completed";

  return (
    <InvestigationDetail
      investigation={{
        _id: String(investigation._id),
        status: investigation.status,
        rootCauseStatus: investigation.rootCauseStatus,
        rootCauseSummary: investigation.rootCauseSummary,
        conclusion: investigation.conclusion,
        incident: incident
          ? {
              _id: idOf(investigation.incidentId),
              incidentCode: incident.incidentCode,
              title: incident.title,
            }
          : null,
        timeline: investigation.timeline.map((entry) => {
          const actorRef = populatedRef<{ name: string }>(entry.actorId, [
            "name",
          ]);
          return {
            occurredAt: new Date(entry.occurredAt).toISOString(),
            action: entry.action,
            description: entry.description,
            actor: actorRef ? { name: actorRef.name } : null,
          };
        }),
        findings: investigation.findings.map((finding) => ({
          title: finding.title,
          description: finding.description,
          evidenceUrls: finding.evidenceUrls,
        })),
        sampleTesting: investigation.sampleTesting
          ? {
              status: investigation.sampleTesting.status,
              laboratoryName: investigation.sampleTesting.laboratoryName,
              referenceNumber: investigation.sampleTesting.referenceNumber,
              resultSummary: investigation.sampleTesting.resultSummary,
              resultDocumentUrl: investigation.sampleTesting.resultDocumentUrl,
              resultReceivedAt: investigation.sampleTesting.resultReceivedAt
                ? new Date(
                    investigation.sampleTesting.resultReceivedAt,
                  ).toISOString()
                : undefined,
            }
          : null,
        correctiveActions: investigation.correctiveActions.map((item) => {
          const owner = populatedRef<{ name: string; email: string }>(
            item.ownerId,
            ["name", "email"],
          );
          const isOwner = idOf(item.ownerId) === String(actor.id);
          return {
            _id: String(item._id),
            action: item.action,
            owner: owner ? { name: owner.name, email: owner.email } : null,
            ownerId: idOf(item.ownerId),
            dueAt: item.dueAt ? new Date(item.dueAt).toISOString() : undefined,
            status: item.status,
            completedAt: item.completedAt
              ? new Date(item.completedAt).toISOString()
              : undefined,
            canUpdateStatus:
              (isAdmin || isAssigned || isOwner) &&
              investigation.status !== "completed",
          };
        }),
      }}
      permissions={{
        isAdmin,
        canEdit,
        selfId: String(actor.id),
        selfName: actor.name,
      }}
    />
  );
}

export default function InvestigationDetailPage({
  params,
}: PageProps<"/app/investigations/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <InvestigationDetailGate params={params} />
    </Suspense>
  );
}
