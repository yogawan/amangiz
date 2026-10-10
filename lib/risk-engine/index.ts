import type { DistributionStatus } from "@/models/Distribution";
import type { FoodBatchStatus } from "@/models/FoodBatch";
import type { IncidentType } from "@/models/Incident";
import type { IRiskRuleTriggered, RiskLevel } from "@/models/RiskAssessment";

/**
 * Rule-based risk engine (PRD 2.4). Deliberately not machine learning: every
 * point of the score traces back to a named rule with a stated reason.
 *
 * ---------------------------------------------------------------------------
 * IMPORTANT — the weights and thresholds below are UNVALIDATED PLACEHOLDERS.
 *
 * PRD 2.4 requires that score bands, rule weights, and risk categories be set
 * explicitly and validated with people who have food-safety expertise before
 * operational use. The numbers here are structural scaffolding so the workflow
 * can be exercised end to end; they are not a calibrated instrument.
 *
 * The output is a triage/prioritisation aid only. It is NOT a probability of
 * food poisoning, NOT a medical diagnosis, and NOT evidence of a cause. The
 * engine version is suffixed `-draft` to keep that explicit in stored records.
 * ---------------------------------------------------------------------------
 */
export const RISK_ENGINE_VERSION = "1.0.0-draft";

/** Temperature danger zone in °C: food held between these bounds is at risk. */
const DANGER_ZONE_MIN_C = 5;
const DANGER_ZONE_MAX_C = 60;

const DISPATCH_DELAY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const TRANSIT_DELAY_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

const SCORE_CAP = 100;

/** Score bands. Must be revisited during expert validation (PRD 2.4). */
const LEVEL_THRESHOLDS: ReadonlyArray<{ min: number; level: RiskLevel }> = [
  { min: 70, level: "critical" },
  { min: 40, level: "high" },
  { min: 20, level: "medium" },
  { min: 0, level: "low" },
];

export interface RiskTemperatureReading {
  value: number;
  recordedAt: Date;
}

export interface RiskEngineInput {
  incidentType: IncidentType;
  reportedAffectedCount?: number;
  occurredAt?: Date | null;
  symptomsReportedCount: number;
  evidenceCount: number;
  batch?: {
    status: FoodBatchStatus;
    storageTemperature?: RiskTemperatureReading[];
  } | null;
  distribution?: {
    status: DistributionStatus;
    scheduledAt?: Date | null;
    dispatchedAt?: Date | null;
    receivedAt?: Date | null;
    dispatchTemperature?: number | null;
    receivedTemperature?: number | null;
  } | null;
  /** Other incidents already recorded against the same batch. */
  relatedBatchIncidentCount: number;
  /** Incidents recorded at the same SPPG within the recent window. */
  recentSppgIncidentCount: number;
}

export interface RiskEngineResult {
  score: number;
  level: RiskLevel;
  rulesTriggered: IRiskRuleTriggered[];
  missingData: string[];
  recommendations: string[];
  engineVersion: string;
}

const inDangerZone = (celsius: number): boolean =>
  celsius > DANGER_ZONE_MIN_C && celsius < DANGER_ZONE_MAX_C;

/** Reported-impact bands. Only the highest matching band contributes. */
function impactRule(count: number): IRiskRuleTriggered | null {
  const bands: ReadonlyArray<{ min: number; weight: number; label: string }> = [
    { min: 50, weight: 40, label: "50 or more" },
    { min: 20, weight: 30, label: "20 to 49" },
    { min: 5, weight: 20, label: "5 to 19" },
    { min: 1, weight: 10, label: "1 to 4" },
  ];
  const band = bands.find((candidate) => count >= candidate.min);
  if (!band) return null;
  return {
    ruleCode: "R-IMPACT-REPORTED",
    ruleName: "Reported affected recipients",
    reason: `${count} affected recipient(s) reported (${band.label} band). This is the reported figure, not a confirmed case count.`,
    weight: band.weight,
  };
}

export function assessRisk(input: RiskEngineInput): RiskEngineResult {
  const rulesTriggered: IRiskRuleTriggered[] = [];
  const missingData: string[] = [];
  const recommendations: string[] = [];

  // --- Reported impact ---------------------------------------------------
  if (input.reportedAffectedCount === undefined) {
    missingData.push("reportedAffectedCount");
  } else {
    const rule = impactRule(input.reportedAffectedCount);
    if (rule) rulesTriggered.push(rule);
  }

  // --- Incident type -----------------------------------------------------
  if (input.incidentType === "suspected_food_safety") {
    rulesTriggered.push({
      ruleCode: "R-TYPE-FOOD-SAFETY",
      ruleName: "Suspected food safety incident",
      reason:
        "Report is categorised as a suspected food safety incident, which warrants prioritised checking.",
      weight: 15,
    });
  } else if (input.incidentType === "temperature_violation") {
    rulesTriggered.push({
      ruleCode: "R-TYPE-TEMPERATURE",
      ruleName: "Temperature violation reported",
      reason: "Report is categorised as a temperature handling violation.",
      weight: 10,
    });
  }

  // --- Batch condition ---------------------------------------------------
  if (!input.batch) {
    missingData.push("batchId");
    recommendations.push(
      "Link this report to the batch it concerns so ingredient and distribution tracing becomes possible.",
    );
  } else {
    const readings = input.batch.storageTemperature ?? [];
    if (readings.length === 0) {
      missingData.push("batch.storageTemperature");
    } else {
      const offending = readings.filter((reading) =>
        inDangerZone(reading.value),
      );
      if (offending.length > 0) {
        rulesTriggered.push({
          ruleCode: "R-TEMP-STORAGE",
          ruleName: "Storage temperature in danger zone",
          reason: `${offending.length} of ${readings.length} storage reading(s) fell between ${DANGER_ZONE_MIN_C}°C and ${DANGER_ZONE_MAX_C}°C.`,
          weight: 20,
        });
      }
    }

    if (input.batch.status === "recalled") {
      rulesTriggered.push({
        ruleCode: "R-BATCH-RECALLED",
        ruleName: "Batch already recalled",
        reason:
          "The associated batch carries a recorded recall, indicating a previously identified problem.",
        weight: 25,
      });
    } else if (input.batch.status === "on_hold") {
      rulesTriggered.push({
        ruleCode: "R-BATCH-ON-HOLD",
        ruleName: "Batch on hold",
        reason: "The associated batch is held pending checks.",
        weight: 10,
      });
    }
  }

  // --- Distribution handling --------------------------------------------
  if (!input.distribution) {
    missingData.push("distributionId");
  } else {
    const { distribution } = input;

    for (const [field, value] of [
      ["dispatchTemperature", distribution.dispatchTemperature],
      ["receivedTemperature", distribution.receivedTemperature],
    ] as const) {
      if (value === undefined || value === null) {
        missingData.push(`distribution.${field}`);
      } else if (inDangerZone(value)) {
        rulesTriggered.push({
          ruleCode:
            field === "dispatchTemperature"
              ? "R-TEMP-DISPATCH"
              : "R-TEMP-RECEIVED",
          ruleName:
            field === "dispatchTemperature"
              ? "Dispatch temperature in danger zone"
              : "Received temperature in danger zone",
          reason: `Recorded ${field} of ${value}°C falls between ${DANGER_ZONE_MIN_C}°C and ${DANGER_ZONE_MAX_C}°C.`,
          weight: 15,
        });
      }
    }

    if (distribution.scheduledAt && distribution.dispatchedAt) {
      const delay =
        distribution.dispatchedAt.getTime() -
        distribution.scheduledAt.getTime();
      if (delay > DISPATCH_DELAY_THRESHOLD_MS) {
        rulesTriggered.push({
          ruleCode: "R-DELAY-DISPATCH",
          ruleName: "Dispatch later than scheduled",
          reason: `Dispatch occurred ${Math.round(delay / 3_600_000)} hour(s) after the scheduled time.`,
          weight: 10,
        });
      }
    }

    if (distribution.dispatchedAt && distribution.receivedAt) {
      const transit =
        distribution.receivedAt.getTime() - distribution.dispatchedAt.getTime();
      if (transit > TRANSIT_DELAY_THRESHOLD_MS) {
        rulesTriggered.push({
          ruleCode: "R-DELAY-TRANSIT",
          ruleName: "Extended transit duration",
          reason: `Transit took ${Math.round(transit / 3_600_000)} hour(s) between dispatch and receipt.`,
          weight: 15,
        });
      }
    }

    if (distribution.status === "delayed") {
      rulesTriggered.push({
        ruleCode: "R-STATUS-DELAYED",
        ruleName: "Distribution flagged delayed",
        reason: "The related distribution record is marked as delayed.",
        weight: 10,
      });
    }
  }

  // --- Incident history --------------------------------------------------
  if (input.relatedBatchIncidentCount > 0) {
    rulesTriggered.push({
      ruleCode: "R-HISTORY-BATCH",
      ruleName: "Other incidents on the same batch",
      reason: `${input.relatedBatchIncidentCount} other incident report(s) already reference this batch.`,
      weight: 20,
    });
  }

  if (input.recentSppgIncidentCount >= 3) {
    rulesTriggered.push({
      ruleCode: "R-HISTORY-SPPG",
      ruleName: "Recurring incidents at the same SPPG",
      reason: `${input.recentSppgIncidentCount} incidents recorded at this SPPG in the recent window.`,
      weight: 10,
    });
  }

  // --- Documentation completeness ---------------------------------------
  // Missing documentation never raises the score: absence of evidence is not
  // evidence of severity. It is reported so petugas can go collect it.
  if (input.evidenceCount === 0) missingData.push("evidence");
  if (!input.occurredAt) missingData.push("occurredAt");
  if (input.symptomsReportedCount === 0) missingData.push("symptomsReported");

  // --- Score and level ---------------------------------------------------
  const rawScore = rulesTriggered.reduce((sum, rule) => sum + rule.weight, 0);
  const score = Math.min(rawScore, SCORE_CAP);
  const level =
    LEVEL_THRESHOLDS.find((band) => score >= band.min)?.level ?? "low";

  // --- Recommendations ---------------------------------------------------
  // Operational checking steps only — never a medical conclusion (PRD 7.10).
  const triggeredCodes = new Set(rulesTriggered.map((rule) => rule.ruleCode));

  if (level === "critical" || level === "high") {
    recommendations.push(
      "Prioritise this report for immediate review by an authorised officer.",
      "Identify other distributions from the same batch that may need checking.",
    );
  }
  if (triggeredCodes.has("R-TEMP-STORAGE")) {
    recommendations.push(
      "Review the storage temperature log and the handling procedure at the producing SPPG.",
    );
  }
  if (
    triggeredCodes.has("R-TEMP-DISPATCH") ||
    triggeredCodes.has("R-TEMP-RECEIVED")
  ) {
    recommendations.push(
      "Verify cold-chain handling and the calibration of the thermometer used during distribution.",
    );
  }
  if (
    triggeredCodes.has("R-DELAY-TRANSIT") ||
    triggeredCodes.has("R-DELAY-DISPATCH") ||
    triggeredCodes.has("R-STATUS-DELAYED")
  ) {
    recommendations.push(
      "Review the distribution timeline and confirm how long food was held before being received.",
    );
  }
  if (triggeredCodes.has("R-HISTORY-BATCH")) {
    recommendations.push(
      "Review the other incident reports referencing this batch for a shared pattern.",
    );
  }
  if (missingData.length > 0) {
    recommendations.push(
      `Complete the missing information before drawing conclusions: ${missingData.join(", ")}.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "No prioritisation rule was triggered. Handle through the standard checking queue.",
    );
  }

  return {
    score,
    level,
    rulesTriggered,
    missingData,
    recommendations,
    engineVersion: RISK_ENGINE_VERSION,
  };
}
