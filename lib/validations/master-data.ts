import { z } from "zod";
import { listQuerySchema } from "./common";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9][0-9\s-]{6,19}$/, "Must be a valid phone number");

// ---------------------------------------------------------------- SPPG

const sppgAddressSchema = z.object({
  street: z.string().trim().min(3).max(200),
  village: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Must be 5 digits")
    .optional(),
});

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const sppgStatusSchema = z.enum(["active", "suspended", "inactive"]);

export const createSppgSchema = z.object({
  code: z.string().trim().min(2).max(40).toUpperCase(),
  name: z.string().trim().min(2).max(200),
  address: sppgAddressSchema,
  location: locationSchema.optional(),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: phoneSchema.optional(),
  status: sppgStatusSchema.default("active"),
});

export const updateSppgSchema = createSppgSchema
  .omit({ code: true, status: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const updateSppgStatusSchema = z.object({
  status: sppgStatusSchema,
  reason: z.string().trim().min(3).max(500).optional(),
});

// ------------------------------------------------------------ Supplier

export const supplierTypeSchema = z.enum([
  "agriculture",
  "livestock",
  "seafood",
  "processed_food",
  "other",
]);

export const supplierVerificationSchema = z.enum([
  "pending",
  "verified",
  "rejected",
]);

export const createSupplierSchema = z.object({
  code: z.string().trim().min(2).max(40).toUpperCase(),
  name: z.string().trim().min(2).max(200),
  supplierType: supplierTypeSchema,
  address: z.string().trim().min(3).max(300),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: phoneSchema.optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateSupplierSchema = createSupplierSchema
  .omit({ code: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * Verification is a recorded human decision (PRD 7.5), so a rejection must
 * carry a reason rather than being a bare status flip.
 */
export const updateVerificationSchema = z
  .object({
    verificationStatus: supplierVerificationSchema,
    notes: z.string().trim().min(3).max(500).optional(),
  })
  .refine(
    (value) => value.verificationStatus !== "rejected" || Boolean(value.notes),
    { path: ["notes"], message: "A rejection must include notes" },
  );

// -------------------------------------------------------------- School

const schoolAddressSchema = sppgAddressSchema.omit({ postalCode: true });

export const schoolLevelSchema = z.enum([
  "PAUD",
  "SD",
  "SMP",
  "SMA",
  "SMK",
  "OTHER",
]);

export const createSchoolSchema = z.object({
  code: z.string().trim().min(2).max(40).toUpperCase(),
  name: z.string().trim().min(2).max(200),
  level: schoolLevelSchema.optional(),
  address: schoolAddressSchema,
  contactName: z.string().trim().max(120).optional(),
  contactPhone: phoneSchema.optional(),
  recipientCapacity: z.number().int().min(0).max(100_000).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateSchoolSchema = createSchoolSchema
  .omit({ code: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

// --------------------------------------------------------------- Query

export const masterDataListQuerySchema = listQuerySchema.extend({
  province: z.string().trim().min(2).optional(),
  city: z.string().trim().min(2).optional(),
});

export const supplierListQuerySchema = listQuerySchema.extend({
  supplierType: supplierTypeSchema.optional(),
  verificationStatus: supplierVerificationSchema.optional(),
});

export const schoolListQuerySchema = listQuerySchema.extend({
  level: schoolLevelSchema.optional(),
});
