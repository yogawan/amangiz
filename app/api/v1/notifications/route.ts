import { z } from "zod";
import { route } from "@/lib/api/handler";
import { paginated } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import {
  dateRangeFilter,
  listQuerySchema,
  mergeFilters,
  paginationMeta,
  parseQuery,
  skipFor,
} from "@/lib/validations/common";
import Notification from "@/models/Notification";

const querySchema = listQuerySchema.extend({
  unreadOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

/**
 * The caller's own notifications (PRD 8.13).
 *
 * The recipient filter is taken from the session, never from a query parameter,
 * so one user cannot read another's notifications.
 */
export const GET = route(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, querySchema);

  const filter = mergeFilters(
    { recipientId: user.id },
    query.unreadOnly ? { readAt: { $exists: false } } : {},
    dateRangeFilter("createdAt", query.from, query.to),
  );

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: query.sortOrder === "asc" ? 1 : -1 })
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Notification.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});
