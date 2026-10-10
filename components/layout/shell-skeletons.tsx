import { Skeleton } from "@/components/ui/skeleton";

/** Suspense fallback for the sidebar slot in app/(application)/app/layout.tsx. */
export function SidebarSkeleton() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex flex-col gap-2 px-3 py-4">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </aside>
  );
}

/** Suspense fallback for the topbar slot in app/(application)/app/layout.tsx. */
export function TopbarSkeleton() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-9 w-9 rounded-lg lg:hidden" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="hidden h-4 w-28 sm:block" />
      </div>
    </header>
  );
}
