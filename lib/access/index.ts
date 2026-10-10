import type { Types } from "mongoose";
import { forbidden, notFound, unprocessable } from "@/lib/api/errors";
import { type AuthUser, requireOrganization } from "@/lib/auth/guard";
import {
  assertAssignedInvestigator,
  assertCanReadInvestigations,
  isAdmin,
} from "@/lib/permissions";
import Distribution, { type IDistribution } from "@/models/Distribution";
import FoodBatch, { type IFoodBatch } from "@/models/FoodBatch";
import Incident, { type IIncident } from "@/models/Incident";
import Investigation, { type IInvestigation } from "@/models/Investigation";

/**
 * Loads a single document and authorises the caller against it in one step.
 *
 * Single-document access cannot reuse the list scope filters: a 404-vs-403
 * decision needs the document in hand. Centralising it here keeps every
 * `[id]` route from re-implementing the matrix in PRD 3.2.
 */

export async function loadBatchForRead(
  user: AuthUser,
  id: Types.ObjectId,
): Promise<IFoodBatch> {
  const batch = await FoodBatch.findById(id).exec();
  if (!batch) throw notFound("Batch not found");

  if (isAdmin(user) || user.role === "investigator") return batch;

  if (user.role === "sppg_operator") {
    if (!batch.sppgId.equals(requireOrganization(user))) {
      throw forbidden("This batch belongs to another SPPG");
    }
    return batch;
  }

  // School operator: readable only if the batch actually reached their school.
  const delivered = await Distribution.exists({
    batchId: id,
    schoolId: requireOrganization(user),
  }).exec();
  if (!delivered) {
    throw forbidden("This batch was not distributed to your school");
  }
  return batch;
}

export async function loadBatchForWrite(
  user: AuthUser,
  id: Types.ObjectId,
): Promise<IFoodBatch> {
  if (!isAdmin(user) && user.role !== "sppg_operator") {
    throw forbidden("Changing a batch requires admin or SPPG operator");
  }

  const batch = await FoodBatch.findById(id).exec();
  if (!batch) throw notFound("Batch not found");

  if (
    user.role === "sppg_operator" &&
    !batch.sppgId.equals(requireOrganization(user))
  ) {
    throw forbidden("This batch belongs to another SPPG");
  }
  return batch;
}

export async function loadDistributionForRead(
  user: AuthUser,
  id: Types.ObjectId,
): Promise<IDistribution> {
  const distribution = await Distribution.findById(id).exec();
  if (!distribution) throw notFound("Distribution not found");

  if (isAdmin(user) || user.role === "investigator") return distribution;

  const organizationId = requireOrganization(user);
  const owns =
    user.role === "sppg_operator"
      ? distribution.sppgId.equals(organizationId)
      : distribution.schoolId.equals(organizationId);

  if (!owns) throw forbidden("This distribution is outside your scope");
  return distribution;
}

export async function loadIncidentForRead(
  user: AuthUser,
  id: Types.ObjectId,
): Promise<IIncident> {
  const incident = await Incident.findById(id).exec();
  if (!incident) throw notFound("Incident not found");

  if (isAdmin(user) || user.role === "investigator") return incident;

  const organizationId = requireOrganization(user);

  if (user.role === "sppg_operator") {
    if (!incident.sppgId?.equals(organizationId)) {
      throw forbidden("This incident is outside your SPPG");
    }
    return incident;
  }

  // School operator: their school's incidents, plus anything they reported.
  const ownSchool = incident.schoolId?.equals(organizationId) ?? false;
  const ownReport = incident.reportedBy.equals(user.id);
  if (!ownSchool && !ownReport) {
    throw forbidden("This incident is outside your school");
  }
  return incident;
}

/**
 * Write access to an incident. Reporters may correct their own report while it
 * is still untriaged; otherwise mutation is for investigators and admins.
 */
export async function loadIncidentForWrite(
  user: AuthUser,
  id: Types.ObjectId,
): Promise<IIncident> {
  const incident = await loadIncidentForRead(user, id);

  if (isAdmin(user) || user.role === "investigator") return incident;

  if (!incident.reportedBy.equals(user.id)) {
    throw forbidden("You may only amend a report you filed yourself");
  }
  if (incident.status !== "reported") {
    throw forbidden(
      `This report is already "${incident.status}" and can no longer be amended by the reporter`,
    );
  }
  return incident;
}

export async function loadInvestigationForRead(
  user: AuthUser,
  id: Types.ObjectId,
): Promise<IInvestigation> {
  assertCanReadInvestigations(user);

  const investigation = await Investigation.findById(id).exec();
  if (!investigation) throw notFound("Investigation not found");

  return investigation;
}

/**
 * Write access to an investigation: the assigned investigator or an admin
 * (PRD 3.3 #6), and only while the case is still open.
 */
export async function loadInvestigationForWrite(
  user: AuthUser,
  id: Types.ObjectId,
): Promise<IInvestigation> {
  const investigation = await loadInvestigationForRead(user, id);
  assertAssignedInvestigator(user, investigation.assignedTo);

  if (investigation.status === "completed") {
    throw unprocessable(
      "This investigation is completed; reopen it before recording further work",
    );
  }
  return investigation;
}
