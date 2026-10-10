import { z } from "zod";
import { isoDateSchema, listQuerySchema, objectIdSchema } from "./common";

export const batchStatusSchema = z.enum([
  "draft",
  "prepared",
  "released",
  "on_hold",
  "recalled",
  "completed",
]);

const ingredientSchema = z.object({
  supplierId: objectIdSchema,
  ingredientName: z.string().trim().min(2).max(160),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(20),
  supplierBatchCode: z.string().trim().max(80).optional(),
});

const temperatureReadingSchema = z.object({
  value: z.number().min(-50).max(150),
  unit: z.literal("C").default("C"),
  recordedAt: isoDateSchema,
});

export const createBatchSchema = z.object({
  sppgId: objectIdSchema.optional(),
  menuName: z.string().trim().min(2).max(200),
  productionDate: isoDateSchema,
  expiryAt: isoDateSchema.optional(),
  ingredients: z.array(ingredientSchema).max(100).default([]),
  storageTemperature: z.array(temperatureReadingSchema).max(200).optional(),
  productionNotes: z.string().trim().max(2000).optional(),
});

export const updateBatchSchema = z
  .object({
    menuName: z.string().trim().min(2).max(200).optional(),
    productionDate: isoDateSchema.optional(),
    expiryAt: isoDateSchema.optional(),
    ingredients: z.array(ingredientSchema).max(100).optional(),
    storageTemperature: z.array(temperatureReadingSchema).max(200).optional(),
    productionNotes: z.string().trim().max(2000).optional(),
    status: batchStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * Hold / release / recall each require a stated reason: PRD 8.8 requires these
 * containment actions to record authorisation and justification, not just a
 * status change.
 */
export const batchActionSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
  notes: z.string().trim().max(2000).optional(),
});

export const batchListQuerySchema = listQuerySchema.extend({
  status: batchStatusSchema.optional(),
  sppgId: objectIdSchema.optional(),
  menuName: z.string().trim().min(2).optional(),
});

/**
 * Allowed batch status transitions (PRD 10.2: business validation must prevent
 * nonsensical transitions). `recalled` is terminal and distinct from `on_hold`.
 */
export const BATCH_TRANSITIONS: Record<
  z.infer<typeof batchStatusSchema>,
  readonly z.infer<typeof batchStatusSchema>[]
> = {
  draft: ["prepared", "on_hold"],
  prepared: ["released", "on_hold", "draft"],
  released: ["completed", "on_hold", "recalled"],
  on_hold: ["released", "recalled", "prepared"],
  recalled: [],
  completed: ["recalled"],
};
