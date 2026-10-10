import type { AuthUser } from "@/lib/auth/guard";
import { userListQuerySchema } from "@/lib/validations/user";
import { listUsers } from "@/services/master-data.service";
import { UsersTable } from "./users-table";

export async function UsersPanel({ actor }: { actor: AuthUser }) {
  const query = userListQuerySchema.parse({ limit: 100, sortOrder: "desc" });
  const { data } = await listUsers(actor, query);

  return (
    <UsersTable
      initialData={data.map((user) => ({
        ...user,
        _id: user._id.toString(),
        organizationId: user.organizationId?.toString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      }))}
    />
  );
}
