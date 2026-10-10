import { loadDistributionForRead } from "@/lib/access";
import { type IdParam, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { routeObjectId } from "@/lib/validations/common";
import AuditLog from "@/models/AuditLog";

interface TimelineEntry {
  at: Date;
  event: string;
  label: string;
  detail?: Record<string, unknown>;
}

/**
 * Shipment history (PRD 8.9).
 *
 * Built from the timestamps actually stored on the record plus the audit trail,
 * so a step that was never recorded simply does not appear — the timeline never
 * implies an unrecorded leg happened.
 */
export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  const distribution = await loadDistributionForRead(user, id);

  const entries: TimelineEntry[] = [];

  entries.push({
    at: distribution.createdAt,
    event: "created",
    label: "Distribution record created",
  });

  if (distribution.scheduledAt) {
    entries.push({
      at: distribution.scheduledAt,
      event: "scheduled",
      label: "Scheduled for delivery",
    });
  }
  if (distribution.dispatchedAt) {
    entries.push({
      at: distribution.dispatchedAt,
      event: "dispatched",
      label: "Dispatched from SPPG",
      detail: { temperature: distribution.dispatchTemperature ?? null },
    });
  }
  if (distribution.receivedAt) {
    entries.push({
      at: distribution.receivedAt,
      event: "received",
      label: "Received at school",
      detail: { temperature: distribution.receivedTemperature ?? null },
    });
  }

  const auditEntries = await AuditLog.find({
    resourceType: "Distribution",
    resourceId: id,
  })
    .select("action createdAt actorId metadata changes")
    .populate("actorId", "name role")
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  return ok({
    distributionCode: distribution.distributionCode,
    status: distribution.status,
    receiptConfirmed: Boolean(distribution.receivedAt),
    timeline: entries.sort((a, b) => a.at.getTime() - b.at.getTime()),
    auditTrail: auditEntries,
  });
});
