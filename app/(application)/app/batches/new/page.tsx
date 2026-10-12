import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BatchForm } from "@/components/batches/batch-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Tambah Batch - AMANGIZ" };

async function NewBatchGate() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  // PRD §8.8: creating a batch is Admin / SPPG Operator only.
  if (actor.role !== "admin" && actor.role !== "sppg_operator") {
    redirect("/app/batches");
  }

  return <BatchForm mode="create" canPickSppg={actor.role === "admin"} />;
}

export default function NewBatchPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tambah Batch</h1>
        <p className="text-sm text-muted">
          Catat batch produksi baru dan bahan bakunya.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewBatchGate />
      </Suspense>
    </div>
  );
}
