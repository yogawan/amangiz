import { z } from "zod";
import { isoDateSchema, listQuerySchema, objectIdSchema } from "./common";

export const incidentTypeSchema = z.enum([
  "suspected_food_safety",
  "temperature_violation",
  "distribution_issue",
  "packaging_issue",
  "other",
]);

export const incidentStatusSchema = z.enum([
  "reported",
  "triaged",
  "containment_in_progress",
  "under_investigation",
  "resolved",
  "closed",
]);

export const incidentSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
  "unassessed",
]);

export const createIncidentSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(5000),
  incidentType: incidentTypeSchema,
  batchId: objectIdSchema.optional(),
  distributionId: objectIdSchema.optional(),
  schoolId: objectIdSchema.optional(),
  occurredAt: isoDateSchema.optional(),
  reportedAffectedCount: z.number().int().min(0).max(100_000).optional(),
  // Free-text observations only. Never interpreted into a diagnosis (PRD 7.9).
  symptomsReported: z
    .array(z.string().trim().min(2).max(120))
    .max(30)
    .optional(),
});

export const updateIncidentSchema = z
  .object({
    title: z.string().trim().min(5).max(200).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    incidentType: incidentTypeSchema.optional(),
    batchId: objectIdSchema.optional(),
    distributionId: objectIdSchema.optional(),
    occurredAt: isoDateSchema.optional(),
    reportedAffectedCount: z.number().int().min(0).max(100_000).optional(),
    symptomsReported: z
      .array(z.string().trim().min(2).max(120))
      .max(30)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const incidentEvidenceSchema = z.object({
  publicId: z.string().trim().min(3).max(300),
  description: z.string().trim().max(500).optional(),
});

export const assignIncidentSchema = z.object({
  investigatorId: objectIdSchema,
  note: z.string().trim().max(1000).optional(),
});

/**
 * Triage records the officer's own judgement of severity. It is intentionally
 * separate from the risk engine's output so an initial report, a rule-based
 * score, and a human assessment stay distinguishable (PRD 6.4 #4).
 */
export const triageIncidentSchema = z.object({
  severity: incidentSeveritySchema.exclude(["unassessed"]),
  note: z.string().trim().min(5).max(2000),
});

export const resolveIncidentSchema = z.object({
  resolutionSummary: z.string().trim().min(10).max(5000),
});

export const closeIncidentSchema = z.object({
  note: z.string().trim().min(5).max(2000),
});

export const incidentListQuerySchema = listQuerySchema.extend({
  status: incidentStatusSchema.optional(),
  severity: incidentSeveritySchema.optional(),
  incidentType: incidentTypeSchema.optional(),
  batchId: objectIdSchema.optional(),
  schoolId: objectIdSchema.optional(),
  sppgId: objectIdSchema.optional(),
  assignedInvestigatorId: objectIdSchema.optional(),
});

/**
 * Allowed incident transitions (PRD 8.10: a case must not be closed merely
 * because a report exists). `closed` is only reachable from `resolved`.
 */
export const INCIDENT_TRANSITIONS: Record<
  z.infer<typeof incidentStatusSchema>,
  readonly z.infer<typeof incidentStatusSchema>[]
> = {
  reported: ["triaged", "containment_in_progress"],
  triaged: ["containment_in_progress", "under_investigation", "resolved"],
  containment_in_progress: ["under_investigation", "resolved"],
  under_investigation: ["resolved", "containment_in_progress"],
  resolved: ["closed", "under_investigation"],
  closed: [],
};
