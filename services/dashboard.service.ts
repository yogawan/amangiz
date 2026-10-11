import type { PipelineStage, Types } from "mongoose";
import type { AuthUser } from "@/lib/auth/guard";
import {
  assertCanReadRiskAssessment,
  batchScopeAsync,
  distributionScope,
  incidentScope,
} from "@/lib/permissions";
import { RISK_ENGINE_VERSION } from "@/lib/risk-engine";
import { mergeFilters } from "@/lib/validations/common";
import Distribution from "@/models/Distribution";
import FoodBatch from "@/models/FoodBatch";
import Incident from "@/models/Incident";

/**
 * Dashboard read queries (PRD 8.3, 9.2 #3), extracted from the four
 * app/api/v1/dashboard/*\/route.ts handlers so the same scope-filtered query
 * can be called from both the API route and a future Server Component
 * dashboard page without the permission/filter logic drifting between the two
 * (UI_PLAN.md §0 no-logic-drift rule).
 */

function startOfToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Operational summary. Every count is computed against the caller's scope filter (PRD 8.3). */
export async function getDashboardSummary(user: AuthUser) {
  const batchFilter = await batchScopeAsync(user);
  const distributionFilter = distributionScope(user);
  const incidentFilter = incidentScope(user);

  const todayStart = startOfToday();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayRange = { $gte: todayStart, $lt: todayEnd };

  const [
    batchTotal,
    batchActive,
    batchOnHold,
    batchRecalled,
    distributionsToday,
    pendingReceipt,
    delayedDistributions,
    incidentTotal,
    incidentsByStatus,
    incidentsBySeverity,
    highPriorityCases,
  ] = await Promise.all([
    FoodBatch.countDocuments(batchFilter).exec(),
    FoodBatch.countDocuments(
      mergeFilters(batchFilter, {
        status: { $in: ["prepared", "released"] },
      }),
    ).exec(),
    FoodBatch.countDocuments(
      mergeFilters(batchFilter, { status: "on_hold" }),
    ).exec(),
    FoodBatch.countDocuments(
      mergeFilters(batchFilter, { status: "recalled" }),
    ).exec(),
    Distribution.countDocuments(
      mergeFilters(distributionFilter, {
        $or: [{ scheduledAt: todayRange }, { dispatchedAt: todayRange }],
      }),
    ).exec(),
    Distribution.countDocuments(
      mergeFilters(distributionFilter, {
        status: { $in: ["dispatched", "in_transit"] },
        receivedAt: { $exists: false },
      }),
    ).exec(),
    Distribution.countDocuments(
      mergeFilters(distributionFilter, { status: "delayed" }),
    ).exec(),
    Incident.countDocuments(incidentFilter).exec(),
    Incident.aggregate<{ _id: string; count: number }>([
      { $match: incidentFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec(),
    Incident.aggregate<{ _id: string; count: number }>([
      { $match: incidentFilter },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]).exec(),
    // Latest assessment per scoped incident, kept only when it lands in a
    // high band. Joining from Incident keeps the role scope applied.
    Incident.aggregate<{ count: number }>([
      { $match: incidentFilter },
      {
        $lookup: {
          from: "riskassessments",
          let: { incidentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$incidentId", "$$incidentId"] } } },
            { $sort: { assessedAt: -1 } },
            { $limit: 1 },
            { $project: { level: 1 } },
          ],
          as: "latestRisk",
        },
      },
      { $unwind: "$latestRisk" },
      { $match: { "latestRisk.level": { $in: ["high", "critical"] } } },
      { $count: "count" },
    ]).exec(),
  ]);

  const tally = (rows: { _id: string; count: number }[]) =>
    Object.fromEntries(rows.map((row) => [row._id, row.count]));

  const statusCounts = tally(incidentsByStatus);
  const openIncidents = incidentTotal - (statusCounts.closed ?? 0);

  return {
    scope: { role: user.role, organizationId: user.organizationId ?? null },
    batches: {
      total: batchTotal,
      active: batchActive,
      onHold: batchOnHold,
      recalled: batchRecalled,
    },
    distributions: {
      today: distributionsToday,
      pendingReceipt,
      delayed: delayedDistributions,
    },
    incidents: {
      total: incidentTotal,
      open: openIncidents,
      byStatus: statusCounts,
      bySeverity: tally(incidentsBySeverity),
    },
    risk: { highPriorityCases: highPriorityCases[0]?.count ?? 0 },
    generatedAt: new Date(),
  };
}

/** Recent and unresolved incidents for the dashboard. */
export async function getDashboardIncidents(user: AuthUser, limit: number) {
  const scope = incidentScope(user);

  const [recent, awaitingAction] = await Promise.all([
    Incident.find(scope)
      .select(
        "incidentCode title incidentType status severity reportedAt reportedAffectedCount batchId schoolId",
      )
      .populate("schoolId", "code name")
      .populate("batchId", "batchCode menuName")
      .sort({ reportedAt: -1 })
      .limit(limit)
      .lean()
      .exec(),
    Incident.find(
      mergeFilters(scope, { status: { $in: ["reported", "triaged"] } }),
    )
      .select("incidentCode title status severity reportedAt")
      .sort({ reportedAt: 1 })
      .limit(limit)
      .lean()
      .exec(),
  ]);

  return { recent, awaitingAction };
}

/** Distribution overview for the dashboard, including late deliveries. */
export async function getDashboardDistributions(user: AuthUser, limit: number) {
  const scope = distributionScope(user);
  const now = new Date();

  const [upcoming, awaitingReceipt, overdue, byStatus] = await Promise.all([
    Distribution.find(
      mergeFilters(scope, {
        status: "planned",
        scheduledAt: { $gte: now },
      }),
    )
      .select(
        "distributionCode batchId schoolId quantity unit scheduledAt status",
      )
      .populate("schoolId", "code name")
      .populate("batchId", "batchCode menuName")
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .lean()
      .exec(),
    Distribution.find(
      mergeFilters(scope, {
        status: { $in: ["dispatched", "in_transit"] },
        receivedAt: { $exists: false },
      }),
    )
      .select("distributionCode batchId schoolId dispatchedAt status")
      .populate("schoolId", "code name")
      .sort({ dispatchedAt: 1 })
      .limit(limit)
      .lean()
      .exec(),
    // Scheduled in the past but never dispatched: the "distribusi terlambat"
    // card in PRD 9.2 #3.
    Distribution.find(
      mergeFilters(scope, {
        status: { $in: ["planned", "delayed"] },
        scheduledAt: { $lt: now },
        dispatchedAt: { $exists: false },
      }),
    )
      .select("distributionCode batchId schoolId scheduledAt status")
      .populate("schoolId", "code name")
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .lean()
      .exec(),
    Distribution.aggregate<{ _id: string; count: number }>([
      { $match: scope },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec(),
  ]);

  return {
    upcoming,
    awaitingReceipt,
    overdue,
    byStatus: Object.fromEntries(byStatus.map((row) => [row._id, row.count])),
  };
}

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
    recommendations: string[];
  };
}

const LEVEL_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Risk prioritisation overview (PRD 9.2 #8). Permission-checked here (not
 * just in the route) so a Server Component caller gets the same 403 for
 * School Operator that the API already enforces.
 */
export async function getDashboardRiskOverview(user: AuthUser, limit: number) {
  assertCanReadRiskAssessment(user);

  const scope = incidentScope(user);

  // One pipeline, reused: latest assessment joined onto each scoped incident.
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
            // PRD 9.2 #8 lists "Recommended actions" as a component of the
            // risk-analysis page, so it travels with the top cases.
            "latestRisk.recommendations": 1,
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

  return {
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
  };
}
