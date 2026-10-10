import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import {
  batchScopeAsync,
  distributionScope,
  incidentScope,
} from "@/lib/permissions";
import { mergeFilters } from "@/lib/validations/common";
import Distribution from "@/models/Distribution";
import FoodBatch from "@/models/FoodBatch";
import Incident from "@/models/Incident";

function startOfToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Operational summary for PRD 9.2 #3. Every count is computed against the
 * caller's scope filter, so two roles looking at the same dashboard see only
 * the slice they are authorised for (PRD 8.3).
 */
export const GET = route(async () => {
  const user = await requireUser();

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
      mergeFilters(batchFilter, { status: { $in: ["prepared", "released"] } }),
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

  return ok({
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
  });
});
