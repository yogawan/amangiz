import { loadDistributionForRead } from "@/lib/access";
import { forbidden, unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireOrganization, requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import {
  DISTRIBUTION_TRANSITIONS,
  receiveSchema,
} from "@/lib/validations/distribution";
import { assertTransition } from "@/lib/workflow";

/**
 * Records receipt at the school (PRD 8.9).
 *
 * PRD 8.9 requires verifying the caller actually has access to the receiving
 * school, so a school operator may only confirm deliveries addressed to their
 * own school.
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "school_operator") {
    throw forbidden(
      "Recording receipt requires the receiving school operator or admin",
    );
  }

  const id = await routeObjectId(params);
  const input = receiveSchema.parse(await readJson(request));

  const distribution = await loadDistributionForRead(actor, id);

  if (
    actor.role === "school_operator" &&
    !distribution.schoolId.equals(requireOrganization(actor))
  ) {
    throw forbidden("This delivery is addressed to another school");
  }

  assertTransition(
    "Distribution status",
    distribution.status,
    "delivered",
    DISTRIBUTION_TRANSITIONS,
  );

  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();

  if (receivedAt.getTime() > Date.now() + 60_000) {
    throw unprocessable("receivedAt cannot be in the future");
  }
  if (
    distribution.dispatchedAt &&
    receivedAt.getTime() < distribution.dispatchedAt.getTime()
  ) {
    throw unprocessable("receivedAt cannot be earlier than dispatchedAt");
  }

  const previousStatus = distribution.status;
  distribution.status = "delivered";
  distribution.receivedAt = receivedAt;
  if (input.receivedTemperature !== undefined) {
    distribution.receivedTemperature = input.receivedTemperature;
  }
  if (input.notes) distribution.notes = input.notes;
  await distribution.save();

  await recordAudit({
    actorId: actor.id,
    action: "distribution.receive",
    resourceType: "Distribution",
    resourceId: distribution._id,
    organizationId: distribution.schoolId,
    changes: [{ field: "status", before: previousStatus, after: "delivered" }],
    metadata: { receivedAt, receivedTemperature: input.receivedTemperature },
  });

  return ok({
    id: distribution._id,
    status: distribution.status,
    receivedAt: distribution.receivedAt,
  });
});
