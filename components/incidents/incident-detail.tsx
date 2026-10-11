"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge, type RiskLevel } from "@/components/shared/risk-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignInvestigatorDialog } from "./assign-investigator-dialog";
import { CloseDialog } from "./close-dialog";
import { IncidentEvidenceUpload } from "./incident-evidence-upload";
import { ResolveDialog } from "./resolve-dialog";
import { RunRiskAssessmentButton } from "./run-risk-assessment-button";
import { TriageDialog } from "./triage-dialog";

const DISCLAIMER =
  "Skor ini alat bantu prioritisasi berbasis aturan, bukan probabilitas keracunan atau diagnosis medis.";

export interface IncidentDetailData {
  _id: string;
  incidentCode: string;
  title: string;
  description: string;
  incidentType: string;
  status: string;
  severity: string;
  occurredAt?: string;
  reportedAt: string;
  reportedAffectedCount?: number;
  symptomsReported?: string[];
  reportedBy: { name: string; role: string } | null;
  batch: { batchCode: string; menuName: string } | null;
  distribution: { distributionCode: string } | null;
  school: { code: string; name: string } | null;
  evidence: {
    url: string;
    publicId: string;
    fileType: string;
    description?: string;
  }[];
}

export interface LatestRiskAssessmentData {
  score: number;
  level: string;
  rulesTriggered: {
    ruleCode: string;
    ruleName: string;
    reason: string;
    weight: number;
  }[];
  missingData: string[];
  recommendations: string[];
  engineVersion: string;
  assessedAt: string;
}

export interface InvestigationSummaryData {
  _id: string;
  status: string;
  assignedTo: { name: string } | null;
  rootCauseStatus: string;
}

export interface IncidentPermissions {
  actorRole: string;
  actorId: string;
  canAssign: boolean;
  canTriage: boolean;
  canRunRiskAssessment: boolean;
  canResolve: boolean;
  canClose: boolean;
  canUploadEvidence: boolean;
}

export function IncidentDetail({
  incident,
  riskAssessment,
  investigation,
  permissions,
}: {
  incident: IncidentDetailData;
  riskAssessment: LatestRiskAssessmentData | null;
  investigation: InvestigationSummaryData | null;
  permissions: IncidentPermissions;
}) {
  const [dialog, setDialog] = useState<
    "assign" | "assign-self" | "triage" | "resolve" | "close" | null
  >(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted">
            {incident.incidentCode}
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            {incident.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={incident.status} />
            {incident.severity === "unassessed" ? (
              <span className="inline-flex items-center rounded-md bg-muted/10 px-2.5 py-1 text-xs font-semibold text-muted">
                Severity: Belum Dinilai
              </span>
            ) : (
              <RiskBadge level={incident.severity as RiskLevel} />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canAssign && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDialog(
                  permissions.actorRole === "admin" ? "assign" : "assign-self",
                )
              }
            >
              {investigation ? "Ganti Investigator" : "Tugaskan Investigator"}
            </Button>
          )}
          {permissions.canTriage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog("triage")}
            >
              Triage
            </Button>
          )}
          {permissions.canResolve && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog("resolve")}
            >
              Selesaikan
            </Button>
          )}
          {permissions.canClose && (
            <Button size="sm" onClick={() => setDialog("close")}>
              Tutup Insiden
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Laporan Awal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Jenis Insiden" value={incident.incidentType} />
          <Field
            label="Dilaporkan oleh"
            value={
              incident.reportedBy
                ? `${incident.reportedBy.name} (${incident.reportedBy.role})`
                : "—"
            }
          />
          <Field
            label="Waktu Lapor"
            value={new Date(incident.reportedAt).toLocaleString("id-ID")}
          />
          <Field
            label="Waktu Kejadian"
            value={
              incident.occurredAt
                ? new Date(incident.occurredAt).toLocaleString("id-ID")
                : "Tidak dicatat"
            }
          />
          <Field
            label="Jumlah Terdampak (dilaporkan)"
            value={incident.reportedAffectedCount?.toString() ?? "—"}
          />
          <Field
            label="Batch Terkait"
            value={
              incident.batch
                ? `${incident.batch.batchCode} — ${incident.batch.menuName}`
                : "—"
            }
          />
          <Field
            label="Distribusi Terkait"
            value={incident.distribution?.distributionCode ?? "—"}
          />
          <Field
            label="Sekolah"
            value={
              incident.school
                ? `${incident.school.code} — ${incident.school.name}`
                : "—"
            }
          />
        </CardContent>
        <CardContent className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted">
            Kronologi / Deskripsi
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {incident.description}
          </p>
        </CardContent>
        {incident.symptomsReported && incident.symptomsReported.length > 0 && (
          <CardContent className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted">
              Gejala yang Dilaporkan
            </p>
            <p className="mt-1 text-sm text-foreground">
              {incident.symptomsReported.join(", ")}
            </p>
            <p className="mt-1 text-xs text-muted">
              Catatan observasi, bukan diagnosis.
            </p>
          </CardContent>
        )}
        <CardContent className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted">Bukti Pendukung</p>
            {permissions.canUploadEvidence && (
              <IncidentEvidenceUpload incidentId={incident._id} />
            )}
          </div>
          {incident.evidence.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Belum ada bukti diunggah.</p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {incident.evidence.map((item) => (
                <a
                  key={item.publicId}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block h-20 overflow-hidden rounded-md border border-border"
                >
                  {item.fileType === "image" ? (
                    <Image
                      src={item.url}
                      alt={item.description ?? "Bukti"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-background text-xs text-muted">
                      Dokumen
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-warning/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>2. Penilaian Risiko (Rule-Based)</CardTitle>
            {permissions.canRunRiskAssessment && (
              <RunRiskAssessmentButton
                incidentId={incident._id}
                incidentCode={incident.incidentCode}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="rounded-lg bg-warning/10 px-3.5 py-2.5 text-xs leading-5 text-foreground">
            {DISCLAIMER}
          </p>
          {!riskAssessment ? (
            <EmptyState
              title="Belum ada penilaian risiko"
              description="Jalankan penilaian untuk melihat skor prioritas dan aturan yang terpenuhi."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge level={riskAssessment.level as RiskLevel} />
                <span className="text-sm text-muted">
                  Skor:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {riskAssessment.score}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  Engine {riskAssessment.engineVersion} ·{" "}
                  {new Date(riskAssessment.assessedAt).toLocaleString("id-ID")}
                </span>
              </div>
              {riskAssessment.rulesTriggered.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted">
                    Aturan yang Terpenuhi
                  </p>
                  <ul className="mt-2 space-y-2">
                    {riskAssessment.rulesTriggered.map((rule) => (
                      <li
                        key={rule.ruleCode}
                        className="rounded-lg border border-border p-3 text-sm"
                      >
                        <p className="font-medium text-foreground">
                          {rule.ruleName}{" "}
                          <span className="font-mono text-xs text-muted">
                            +{rule.weight}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted">{rule.reason}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {riskAssessment.missingData.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted">
                    Data yang Masih Diperlukan
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {riskAssessment.missingData.join(", ")}
                  </p>
                </div>
              )}
              {riskAssessment.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted">
                    Rekomendasi Langkah
                  </p>
                  <ul className="mt-1 list-inside list-disc text-sm text-foreground">
                    {riskAssessment.recommendations.map((recommendation) => (
                      <li key={recommendation}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Investigasi</CardTitle>
        </CardHeader>
        <CardContent>
          {!investigation ? (
            <EmptyState
              title="Belum ada investigasi"
              description="Tugaskan investigator untuk membuka investigasi."
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field
                  label="Status Investigasi"
                  value={<StatusBadge status={investigation.status} />}
                />
                <Field
                  label="Investigator"
                  value={investigation.assignedTo?.name ?? "—"}
                />
                <Field
                  label="Status Akar Masalah"
                  value={investigation.rootCauseStatus}
                />
              </div>
              <Link
                href={`/app/investigations/${investigation._id}`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Lihat detail investigasi →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <AssignInvestigatorDialog
        incidentId={incident._id}
        incidentCode={incident.incidentCode}
        mode="admin"
        selfId={permissions.actorId}
        open={dialog === "assign"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <AssignInvestigatorDialog
        incidentId={incident._id}
        incidentCode={incident.incidentCode}
        mode="self"
        selfId={permissions.actorId}
        open={dialog === "assign-self"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <TriageDialog
        incidentId={incident._id}
        incidentCode={incident.incidentCode}
        open={dialog === "triage"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <ResolveDialog
        incidentId={incident._id}
        incidentCode={incident.incidentCode}
        open={dialog === "resolve"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <CloseDialog
        incidentId={incident._id}
        incidentCode={incident.incidentCode}
        open={dialog === "close"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="mt-0.5 text-foreground">{value}</div>
    </div>
  );
}
