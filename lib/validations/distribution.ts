import { z } from "zod";
import { isoDateSchema, listQuerySchema, objectIdSchema } from "./common";

export const distributionStatusSchema = z.enum([
  "planned",
  "dispatched",
  "in_transit",
  "delivered",
  "delayed",
  "cancelled",
]);

export const createDistributionSchema = z.object({
  batchId: objectIdSchema,
  schoolId: objectIdSchema,
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(20),
  scheduledAt: isoDateSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateDistributionSchema = z
  .object({
    quantity: z.number().positive().max(1_000_000).optional(),
    unit: z.string().trim().min(1).max(20).optional(),
    scheduledAt: isoDateSchema.optional(),
    status: distributionStatusSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const dispatchSchema = z.object({
  dispatchedAt: isoDateSchema.optional(),
  dispatchTemperature: z.number().min(-50).max(150).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const receiveSchema = z.object({
  receivedAt: isoDateSchema.optional(),
  receivedTemperature: z.number().min(-50).max(150).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const distributionEvidenceSchema = z.object({
  publicId: z.string().trim().min(3).max(300),
});

export const distributionListQuerySchema = listQuerySchema.extend({
  status: distributionStatusSchema.optional(),
  batchId: objectIdSchema.optional(),
  schoolId: objectIdSchema.optional(),
  sppgId: objectIdSchema.optional(),
});

/**
 * Allowed distribution transitions (PRD 10.2). Note `cancelled` is terminal:
 * the PRD calls out specifically that a cancelled distribution must not jump
 * straight to received without a documented correction.
 */
export const DISTRIBUTION_TRANSITIONS: Record<
  z.infer<typeof distributionStatusSchema>,
  readonly z.infer<typeof distributionStatusSchema>[]
> = {
  planned: ["dispatched", "delayed", "cancelled"],
  dispatched: ["in_transit", "delivered", "delayed", "cancelled"],
  in_transit: ["delivered", "delayed", "cancelled"],
  delayed: ["dispatched", "in_transit", "delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
