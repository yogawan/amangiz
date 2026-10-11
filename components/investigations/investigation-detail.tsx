"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompleteDialog } from "./complete-dialog";
import {
  type CorrectiveActionData,
  CorrectiveActionsSection,
} from "./corrective-actions-section";
import { type FindingData, FindingsSection } from "./findings-section";
import { LabResultSection, type SampleTestingData } from "./lab-result-section";
import { RootCauseDialog } from "./root-cause-dialog";
import { type TimelineEntryData, TimelineSection } from "./timeline-section";

export interface InvestigationDetailData {
  _id: string;
  status: string;
  rootCauseStatus: string;
  rootCauseSummary?: string;
  conclusion?: string;
  incident: {
    _id: string;
    incidentCode: string;
    title: string;
  } | null;
  timeline: TimelineEntryData[];
  findings: FindingData[];
  sampleTesting: SampleTestingData | null;
  correctiveActions: CorrectiveActionData[];
}

export interface InvestigationPermissions {
  isAdmin: boolean;
  canEdit: boolean;
  selfId: string;
  selfName: string;
}

export function InvestigationDetail({
  investigation,
  permissions,
}: {
  investigation: InvestigationDetailData;
  permissions: InvestigationPermissions;
}) {
  const [showRootCause, setShowRootCause] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {investigation.incident && (
            <Link
              href={`/app/incidents/${investigation.incident._id}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              ← {investigation.incident.incidentCode}
            </Link>
          )}
          <h1 className="mt-1 text-xl font-semibold text-text-primary">
            {investigation.incident?.title ?? "Investigasi"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={investigation.status} />
            <StatusBadge status={investigation.rootCauseStatus} />
          </div>
        </div>
        {permissions.canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRootCause(true)}
            >
              Akar Masalah
            </Button>
            {investigation.status !== "completed" && (
              <Button size="sm" onClick={() => setShowComplete(true)}>
                Selesaikan Investigasi
              </Button>
            )}
          </div>
        )}
      </div>

      {investigation.rootCauseSummary && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-text-secondary">
              Ringkasan Akar Masalah
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {investigation.rootCauseSummary}
            </p>
          </CardContent>
        </Card>
      )}
      {investigation.conclusion && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-text-secondary">
              Kesimpulan
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {investigation.conclusion}
            </p>
          </CardContent>
        </Card>
      )}

      <TimelineSection
        investigationId={investigation._id}
        entries={investigation.timeline}
        canEdit={permissions.canEdit}
      />
      <FindingsSection
        investigationId={investigation._id}
        findings={investigation.findings}
        canEdit={permissions.canEdit}
      />
      <LabResultSection
        investigationId={investigation._id}
        sampleTesting={investigation.sampleTesting}
        canEdit={permissions.canEdit}
      />
      <CorrectiveActionsSection
        investigationId={investigation._id}
        actions={investigation.correctiveActions}
        canCreate={permissions.canEdit}
        isAdmin={permissions.isAdmin}
        selfId={permissions.selfId}
        selfName={permissions.selfName}
      />

      <RootCauseDialog
        investigationId={investigation._id}
        currentStatus={investigation.rootCauseStatus}
        currentSummary={investigation.rootCauseSummary}
        open={showRootCause}
        onOpenChange={setShowRootCause}
      />
      <CompleteDialog
        investigationId={investigation._id}
        open={showComplete}
        onOpenChange={setShowComplete}
      />
    </div>
  );
}
