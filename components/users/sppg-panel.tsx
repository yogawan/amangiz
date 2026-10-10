import type { AuthUser } from "@/lib/auth/guard";
import { masterDataListQuerySchema } from "@/lib/validations/master-data";
import { listSppgs } from "@/services/master-data.service";
import { SppgTable } from "./sppg-table";

export async function SppgPanel({ actor }: { actor: AuthUser }) {
  const query = masterDataListQuerySchema.parse({
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
  const { data } = await listSppgs(actor, query);

  return (
    <SppgTable
      initialData={data.map((sppg) => ({ ...sppg, _id: sppg._id.toString() }))}
    />
  );
}
