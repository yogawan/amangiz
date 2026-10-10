import { z } from "zod";
import { isoDateSchema, listQuerySchema, objectIdSchema } from "./common";

export const investigationStatusSchema = z.enum([
  "pending",
  "in_progress",
  "awaiting_external_result",
  "completed",
]);

export const rootCauseStatusSchema = z.enum([
  "undetermined",
  "under_review",
  "determined",
]);

export const correctiveActionStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
]);

export const createInvestigationSchema = z.object({
  incidentId: objectIdSchema,
  assignedTo: objectIdSchema,
});

export const updateInvestigationSchema = z
  .object({
    status: investigationStatusSchema.optional(),
    assignedTo: objectIdSchema.optional(),
    rootCauseStatus: rootCauseStatusSchema.optional(),
    rootCauseSummary: z.string().trim().min(10).max(5000).optional(),
    conclusion: z.string().trim().min(10).max(5000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(
    // PRD 7.11 — a determined root cause must be accompanied by its summary.
    (value) =>
      value.rootCauseStatus !== "determined" || Boolean(value.rootCauseSummary),
    {
      path: ["rootCauseSummary"],
      message:
        'Setting rootCauseStatus to "determined" requires a rootCauseSummary',
    },
  );

export const addTimelineEntrySchema = z.object({
  occurredAt: isoDateSchema,
  action: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(2000),
});

export const addFindingSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  evidenceUrls: z.array(z.url()).max(20).default([]),
});

/**
 * Laboratory results may only be recorded against a verifiable source, so the
 * laboratory name and reference number are required once a result is reported
 * (PRD 2.5, 7.11).
 */
export const labResultSchema = z
  .object({
    status: z.enum(["not_requested", "requested", "in_progress", "completed"]),
    laboratoryName: z.string().trim().min(2).max(200).optional(),
    referenceNumber: z.string().trim().min(2).max(120).optional(),
    resultSummary: z.string().trim().min(5).max(5000).optional(),
    resultDocumentUrl: z.url().optional(),
    resultReceivedAt: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "not_requested") return;

    if (!value.laboratoryName) {
      ctx.addIssue({
        code: "custom",
        path: ["laboratoryName"],
        message: "A requested or completed test must name the laboratory",
      });
    }
    if (value.status !== "completed") return;

    for (const field of [
      "referenceNumber",
      "resultSummary",
      "resultReceivedAt",
    ] as const) {
      if (!value[field]) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `A completed laboratory result requires ${field}`,
        });
      }
    }
  });

export const createCorrectiveActionSchema = z.object({
  action: z.string().trim().min(5).max(500),
  ownerId: objectIdSchema,
  dueAt: isoDateSchema.optional(),
});

export const updateCorrectiveActionSchema = z
  .object({
    action: z.string().trim().min(5).max(500).optional(),
    ownerId: objectIdSchema.optional(),
    dueAt: isoDateSchema.optional(),
    status: correctiveActionStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const completeInvestigationSchema = z.object({
  conclusion: z.string().trim().min(10).max(5000),
});

export const investigationListQuerySchema = listQuerySchema.extend({
  status: investigationStatusSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  rootCauseStatus: rootCauseStatusSchema.optional(),
});
