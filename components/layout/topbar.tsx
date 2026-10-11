import type { AuthUser } from "@/lib/auth/current-user";
import { MobileDrawer } from "./mobile-drawer";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

/** ~64px header (PRD §6.2). Breadcrumb lands in a later phase. */
export function AppTopbar({ user }: { user: AuthUser | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {user && <MobileDrawer role={user.role} />}
      </div>
      {user && (
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu user={user} />
        </div>
      )}
    </header>
  );
}
