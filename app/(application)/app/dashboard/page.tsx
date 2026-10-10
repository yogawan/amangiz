import type { Metadata } from "next";
import { Suspense } from "react";
import { ROLE_LABELS } from "@/components/layout/nav-items";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Dashboard — AMANGIZ",
};

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <p className="text-sm text-text-secondary">
      Halo,{" "}
      <span className="font-semibold text-text-primary">
        {user?.name ?? "Pengguna"}
      </span>
      {user ? ` · ${ROLE_LABELS[user.role]}` : null}
    </p>
  );
}

// Placeholder for Phase 0 (shell only). Stat cards, recent activity, and the
// rest of PRD §9.2 #3 land in Phase 5 once services/dashboard.service.ts (0.8)
// has real pages to feed.
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
      <Suspense fallback={<Skeleton className="h-5 w-56" />}>
        <Greeting />
      </Suspense>
      <p className="mt-4 text-sm text-text-secondary">
        Ringkasan operasional akan ditambahkan pada fase berikutnya.
      </p>
    </div>
  );
}
