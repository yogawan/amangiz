import Image from "next/image";
import Link from "next/link";
import type { UserRole } from "@/models/User";
import { NavLinks } from "./nav-links";

/** Desktop-only fixed sidebar, ~240px (PRD §6.2). Mobile uses MobileDrawer instead. */
export function AppSidebar({ role }: { role: UserRole | null }) {
  if (!role) {
    return <aside className="hidden w-60 shrink-0 lg:block" aria-hidden />;
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
      <Link
        href="/app/dashboard"
        className="flex items-center gap-2.5 px-5 py-5"
      >
        <Image
          src="/Amangiz-Logo.png"
          alt="AMANGIZ"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg"
        />
        <span className="text-base font-extrabold tracking-[-.04em] text-green-950">
          AMANGIZ
        </span>
      </Link>
      <NavLinks role={role} />
    </aside>
  );
}
