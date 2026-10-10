import type { Types } from "mongoose";
import { assessRisk, type RiskEngineInput } from "@/lib/risk-engine";
import Distribution from "@/models/Distribution";
import FoodBatch from "@/models/FoodBatch";
import Incident, { type IIncident } from "@/models/Incident";
import RiskAssessment, { type IRiskAssessment } from "@/models/RiskAssessment";

const SPPG_HISTORY_WINDOW_DAYS = 30;

/**
 * Gathers the engine inputs for one incident from the data actually recorded,
 * runs the rule-based engine, and persists the result as a new immutable
 * assessment record (PRD 7.10 keeps full assessment history).
 *
 * Note: the engine's `level` is deliberately NOT written back onto
 * `Incident.severity`. Severity stays the officer's own triage judgement so an
 * initial report, a rule-based score, and a human assessment remain
 * distinguishable (PRD 6.4 #4). Consumers wanting the engine view read the
 * latest RiskAssessment.
 */
export async function runRiskAssessment(
  incident: Pick<
    IIncident,
    | "_id"
    | "incidentType"
    | "reportedAffectedCount"
    | "occurredAt"
    | "symptomsReported"
    | "evidence"
    | "batchId"
    | "distributionId"
    | "sppgId"
  >,
  assessedBy: Types.ObjectId,
): Promise<IRiskAssessment> {
  const [batch, distribution] = await Promise.all([
    incident.batchId
      ? FoodBatch.findById(incident.batchId)
          .select("status storageTemperature")
          .lean()
          .exec()
      : null,
    incident.distributionId
      ? Distribution.findById(incident.distributionId)
          .select(
            "status scheduledAt dispatchedAt receivedAt dispatchTemperature receivedTemperature",
          )
          .lean()
          .exec()
      : null,
  ]);

  const [relatedBatchIncidentCount, recentSppgIncidentCount] =
    await Promise.all([
      incident.batchId
        ? Incident.countDocuments({
            batchId: incident.batchId,
            _id: { $ne: incident._id },
          }).exec()
        : 0,
      incident.sppgId
        ? Incident.countDocuments({
            sppgId: incident.sppgId,
            _id: { $ne: incident._id },
            reportedAt: {
              $gte: new Date(
                Date.now() - SPPG_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
              ),
            },
          }).exec()
        : 0,
    ]);

  const input: RiskEngineInput = {
    incidentType: incident.incidentType,
    reportedAffectedCount: incident.reportedAffectedCount,
    occurredAt: incident.occurredAt ?? null,
    symptomsReportedCount: incident.symptomsReported?.length ?? 0,
    evidenceCount: incident.evidence?.length ?? 0,
    batch: batch
      ? {
          status: batch.status,
          storageTemperature: batch.storageTemperature?.map((reading) => ({
            value: reading.value,
            recordedAt: reading.recordedAt,
          })),
        }
      : null,
    distribution: distribution
      ? {
          status: distribution.status,
          scheduledAt: distribution.scheduledAt ?? null,
          dispatchedAt: distribution.dispatchedAt ?? null,
          receivedAt: distribution.receivedAt ?? null,
          dispatchTemperature: distribution.dispatchTemperature ?? null,
          receivedTemperature: distribution.receivedTemperature ?? null,
        }
      : null,
    relatedBatchIncidentCount,
    recentSppgIncidentCount,
  };

  const result = assessRisk(input);

  return RiskAssessment.create({
    incidentId: incident._id,
    score: result.score,
    level: result.level,
    rulesTriggered: result.rulesTriggered,
    missingData: result.missingData,
    recommendations: result.recommendations,
    engineVersion: result.engineVersion,
    assessedBy,
    assessedAt: new Date(),
  });
}
