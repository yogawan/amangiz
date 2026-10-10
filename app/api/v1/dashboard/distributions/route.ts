import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { distributionScope } from "@/lib/permissions";
import {
  mergeFilters,
  paginationSchema,
  parseQuery,
} from "@/lib/validations/common";
import Distribution from "@/models/Distribution";

/** Distribution overview for the dashboard, including late deliveries (PRD 9.2 #3). */
export const GET = route(async (request) => {
  const user = await requireUser();
  const { limit } = parseQuery(request, paginationSchema);
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

  return ok(
    {
      upcoming,
      awaitingReceipt,
      overdue,
      byStatus: Object.fromEntries(byStatus.map((row) => [row._id, row.count])),
    },
    { limit },
  );
});
