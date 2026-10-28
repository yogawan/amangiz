import { Suspense } from "react";
import {
  SidebarSkeleton,
  TopbarSkeleton,
} from "@/components/layout/shell-skeletons";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppTopbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/auth/current-user";

// Each reads the session independently so the sidebar and topbar resolve (and
// can be Suspended) on their own — Cache Components requires any cookies()
// read to live inside its own <Suspense> boundary (UI_PLAN.md §0).
async function SidebarSlot() {
  const user = await getCurrentUser();
  return <AppSidebar role={user?.role ?? null} />;
}

async function TopbarSlot() {
  const user = await getCurrentUser();
  return <AppTopbar user={user} />;
}

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarSlot />
      </Suspense>
      <div className="flex min-h-screen flex-col lg:pl-60">
        <Suspense fallback={<TopbarSkeleton />}>
          <TopbarSlot />
        </Suspense>
        <main className="flex-1 bg-surface px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
