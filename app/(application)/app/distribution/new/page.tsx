import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DistributionForm } from "@/components/distribution/distribution-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Tambah Distribusi - AMANGIZ" };

async function NewDistributionGate() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  // PRD §8.9: creating a distribution is Admin / SPPG Operator only.
  if (actor.role !== "admin" && actor.role !== "sppg_operator") {
    redirect("/app/distribution");
  }

  return <DistributionForm />;
}

export default function NewDistributionPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Tambah Distribusi
        </h1>
        <p className="text-sm text-muted">
          Catat pengiriman batch ke sekolah penerima.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewDistributionGate />
      </Suspense>
    </div>
  );
}
