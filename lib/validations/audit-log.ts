import { z } from "zod";
import { listQuerySchema, objectIdSchema } from "./common";

export const auditLogListQuerySchema = listQuerySchema.extend({
  action: z.string().trim().min(2).optional(),
  resourceType: z.string().trim().min(2).optional(),
  resourceId: objectIdSchema.optional(),
  actorId: objectIdSchema.optional(),
});
