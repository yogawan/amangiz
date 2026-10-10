import { z } from "zod";
import { listQuerySchema, objectIdSchema } from "./common";

export const userRoleSchema = z.enum([
  "admin",
  "sppg_operator",
  "school_operator",
  "investigator",
]);

export const organizationTypeSchema = z.enum([
  "system",
  "sppg",
  "school",
  "health_authority",
]);

/**
 * A scope-limited role is meaningless without an organization to scope to, so
 * the pairing is validated here rather than discovered later as a 403.
 */
const requiresOrganization = {
  sppg_operator: "sppg",
  school_operator: "school",
} as const;

const organizationPairing = <
  T extends {
    role?: z.infer<typeof userRoleSchema>;
    organizationType?: z.infer<typeof organizationTypeSchema>;
    organizationId?: string;
  },
>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  if (!value.role) return;
  const expected =
    requiresOrganization[value.role as keyof typeof requiresOrganization];
  if (!expected) return;

  if (value.organizationType !== expected) {
    ctx.addIssue({
      code: "custom",
      path: ["organizationType"],
      message: `Role "${value.role}" requires organizationType "${expected}"`,
    });
  }
  if (!value.organizationId) {
    ctx.addIssue({
      code: "custom",
      path: ["organizationId"],
      message: `Role "${value.role}" requires an organizationId`,
    });
  }
};

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128),
    role: userRoleSchema,
    organizationType: organizationTypeSchema,
    organizationId: objectIdSchema.optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine(organizationPairing);

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.email().trim().toLowerCase().optional(),
    role: userRoleSchema.optional(),
    organizationType: organizationTypeSchema.optional(),
    organizationId: objectIdSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

/** Status changes go through their own endpoint so they are auditable on their own. */
export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const userListQuerySchema = listQuerySchema.extend({
  role: userRoleSchema.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
