import type { AuthUser } from "@/lib/auth/guard";
import { schoolListQuerySchema } from "@/lib/validations/master-data";
import { listSchools } from "@/services/master-data.service";
import { SchoolTable } from "./school-table";

export async function SchoolPanel({ actor }: { actor: AuthUser }) {
  const query = schoolListQuerySchema.parse({
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
  const { data } = await listSchools(actor, query);

  return (
    <SchoolTable
      initialData={data.map((school) => ({
        ...school,
        _id: school._id.toString(),
      }))}
    />
  );
}
