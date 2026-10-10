import type { Types } from "mongoose";
import AuditLog, { type IAuditLogChange } from "@/models/AuditLog";

export interface AuditInput {
  actorId: Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  changes?: IAuditLogChange[];
  metadata?: Record<string, unknown>;
}

/**
 * Appends an audit record (PRD 7.13).
 *
 * Failures are logged but never propagated: the audited mutation has already
 * committed by this point and there is no surrounding transaction to roll back,
 * so throwing would return 500 for an operation that actually succeeded and
 * invite a duplicate retry. A dropped audit row is surfaced in the server log
 * instead.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create(input);
  } catch (error) {
    console.error("[amangiz] failed to write audit log", {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: String(input.resourceId),
      error,
    });
  }
}

/** Builds the `changes` array by diffing only the fields that actually moved. */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[],
): IAuditLogChange[] {
  const changes: IAuditLogChange[] = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    const previous = before[field];
    const next = after[field];
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changes.push({ field, before: previous, after: next });
    }
  }
  return changes;
}
