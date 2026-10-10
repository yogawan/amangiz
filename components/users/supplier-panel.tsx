import type { AuthUser } from "@/lib/auth/guard";
import { supplierListQuerySchema } from "@/lib/validations/master-data";
import { listSuppliers } from "@/services/master-data.service";
import { SupplierTable } from "./supplier-table";

export async function SupplierPanel({ actor }: { actor: AuthUser }) {
  const query = supplierListQuerySchema.parse({
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
  const { data } = await listSuppliers(actor, query);

  return (
    <SupplierTable
      initialData={data.map((supplier) => ({
        ...supplier,
        _id: supplier._id.toString(),
      }))}
    />
  );
}
