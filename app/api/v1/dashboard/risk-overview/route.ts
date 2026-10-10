import type { PipelineStage, Types } from "mongoose";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { assertCanReadRiskAssessment, incidentScope } from "@/lib/permissions";
import { RISK_ENGINE_VERSION } from "@/lib/risk-engine";
import { paginationSchema, parseQuery } from "@/lib/validations/common";
import Incident from "@/models/Incident";

interface LatestRiskRow {
  _id: Types.ObjectId;
  incidentCode: string;
  title: string;
  status: string;
  reportedAt: Date;
  latestRisk: {
    _id: Types.ObjectId;
    score: number;
    level: string;
    assessedAt: Date;
    rulesTriggered: { ruleCode: string; ruleName: string }[];
    missingData: string[];
  };
}

const LEVEL_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Risk prioritisation overview (PRD 8.3, 9.2 #8).
 *
 * Reports the latest assessment per incident plus the rules that drove it, so
 * the UI can explain every priority rather than just showing a number
 * (PRD 6.4 #3, "explainable risk").
 */
export const GET = route(async (request) => {
  const user = await requireUser();
  assertCanReadRiskAssessment(user);

  const { limit } = parseQuery(request, paginationSchema);
  const scope = incidentScope(user);

  // One pipeline, reused: latest assessment joined onto each scoped incident.
  // Annotated so TypeScript keeps each stage matched to its PipelineStage
  // variant instead of widening the array into an incompatible union.
  const withLatestRisk: PipelineStage[] = [
    { $match: scope },
    {
      $lookup: {
        from: "riskassessments",
        let: { incidentId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$incidentId", "$$incidentId"] } } },
          { $sort: { assessedAt: -1 } },
          { $limit: 1 },
        ],
        as: "latestRisk",
      },
    },
    { $unwind: "$latestRisk" },
  ];

  const [distribution, topCases, unassessedCount, ruleFrequency] =
    await Promise.all([
      Incident.aggregate<{ _id: string; count: number }>([
        ...withLatestRisk,
        { $group: { _id: "$latestRisk.level", count: { $sum: 1 } } },
      ]).exec(),
      Incident.aggregate<LatestRiskRow>([
        ...withLatestRisk,
        { $match: { status: { $ne: "closed" } } },
        { $sort: { "latestRisk.score": -1, "latestRisk.assessedAt": -1 } },
        { $limit: limit },
        {
          $project: {
            incidentCode: 1,
            title: 1,
            status: 1,
            reportedAt: 1,
            "latestRisk._id": 1,
            "latestRisk.score": 1,
            "latestRisk.level": 1,
            "latestRisk.assessedAt": 1,
            "latestRisk.rulesTriggered.ruleCode": 1,
            "latestRisk.rulesTriggered.ruleName": 1,
            "latestRisk.missingData": 1,
          },
        },
      ]).exec(),
      // Incidents with no assessment at all still need to be visible: an
      // unscored case is not a low-risk case.
      Incident.aggregate<{ count: number }>([
        { $match: scope },
        {
          $lookup: {
            from: "riskassessments",
            localField: "_id",
            foreignField: "incidentId",
            as: "assessments",
          },
        },
        { $match: { assessments: { $size: 0 } } },
        { $count: "count" },
      ]).exec(),
      Incident.aggregate<{ _id: string; count: number; ruleName: string }>([
        ...withLatestRisk,
        { $unwind: "$latestRisk.rulesTriggered" },
        {
          $group: {
            _id: "$latestRisk.rulesTriggered.ruleCode",
            ruleName: { $first: "$latestRisk.rulesTriggered.ruleName" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).exec(),
    ]);

  const byLevel = Object.fromEntries(
    distribution.map((row) => [row._id, row.count]),
  );

  return ok(
    {
      byLevel: {
        low: byLevel.low ?? 0,
        medium: byLevel.medium ?? 0,
        high: byLevel.high ?? 0,
        critical: byLevel.critical ?? 0,
      },
      unassessedIncidents: unassessedCount[0]?.count ?? 0,
      topCases: topCases.sort(
        (a, b) =>
          (LEVEL_ORDER[b.latestRisk.level] ?? 0) -
          (LEVEL_ORDER[a.latestRisk.level] ?? 0),
      ),
      mostTriggeredRules: ruleFrequency,
      engineVersion: RISK_ENGINE_VERSION,
      // Surfaced with the data so a client cannot present the score as a
      // clinical or probabilistic result (PRD 2.4).
      disclaimer:
        "Risk scores are a rule-based prioritisation aid. They are not a probability of food poisoning and not a medical diagnosis.",
    },
    { limit },
  );
});
