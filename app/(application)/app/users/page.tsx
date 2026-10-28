import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  CardSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";
import { StatCard } from "@/components/shared/stat-card";
import { SchoolPanel } from "@/components/users/school-panel";
import { SppgPanel } from "@/components/users/sppg-panel";
import { SupplierPanel } from "@/components/users/supplier-panel";
import { UsersPanel } from "@/components/users/users-panel";
import { UsersTabsNav } from "@/components/users/users-tabs-nav";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMasterDataSummary } from "@/services/master-data.service";

export const metadata: Metadata = { title: "Pengguna & Master Data - AMANGIZ" };

const TABS = ["users", "sppg", "suppliers", "schools"] as const;
type Tab = (typeof TABS)[number];

function normalizeTab(value: string | string[] | undefined): Tab {
  return (TABS as readonly string[]).includes(value as string)
    ? (value as Tab)
    : "users";
}

// PRD §9.2 #10: "Akses hanya tersedia bagi Administrator." The nav already
// hides this link from other roles; this redirect is the real enforcement
// (permission checks belong on the server, not just hidden UI — PRD §10.1).
async function TabPanel({ tab }: { tab: Tab }) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    redirect("/app/dashboard");
  }

  switch (tab) {
    case "sppg":
      return <SppgPanel actor={actor} />;
    case "suppliers":
      return <SupplierPanel actor={actor} />;
    case "schools":
      return <SchoolPanel actor={actor} />;
    default:
      return <UsersPanel actor={actor} />;
  }
}

// Same admin-only gate as TabPanel — kept here too since this runs in a
// sibling Suspense boundary and can't rely on that redirect firing first.
async function UsersStats() {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    redirect("/app/dashboard");
  }

  const summary = await getMasterDataSummary(actor);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Total Pengguna"
        value={summary.users}
        image="/Pengguna.png"
      />
      <StatCard
        label="Total SPPG"
        value={summary.sppgs}
        image="/Total SPPG.png"
      />
      <StatCard
        label="Total Pemasok"
        value={summary.suppliers}
        image="/Total Pemasok.png"
      />
      <StatCard
        label="Total Sekolah"
        value={summary.schools}
        image="/Total Sekolah.png"
      />
    </div>
  );
}

// See the note in app/(application)/app/batches/page.tsx for why `searchParams`
// is awaited inside a Suspense boundary rather than in the page component.
async function UsersSection({
  searchParams,
}: {
  searchParams: PageProps<"/app/users">["searchParams"];
}) {
  const params = await searchParams;
  const tab = normalizeTab(params.tab);

  return (
    <>
      <UsersTabsNav active={tab} />
      <Suspense key={tab} fallback={<TableSkeleton columns={5} />}>
        <TabPanel tab={tab} />
      </Suspense>
    </>
  );
}

export default function UsersPage({ searchParams }: PageProps<"/app/users">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Pengguna & Master Data
        </h1>
        <p className="text-sm text-muted">
          Kelola pengguna, SPPG, pemasok, dan sekolah.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        }
      >
        <UsersStats />
      </Suspense>
      <Suspense
        fallback={
          <>
            <FilterBarSkeleton fields={4} />
            <TableSkeleton columns={5} />
          </>
        }
      >
        <UsersSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
