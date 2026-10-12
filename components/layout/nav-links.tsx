"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/models/User";
import {
  type NavItem,
  navItemsForRole,
  secondaryNavItemsForRole,
} from "./nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/app/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);
  const secondaryItems = secondaryNavItemsForRole(role);

  return (
    <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLinkItem
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
      {secondaryItems.length > 0 && (
        <ul className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
          {secondaryItems.map((item) => (
            <NavLinkItem
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </nav>
  );
}

function NavLinkItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary-light text-primary"
            : "text-muted hover:bg-background hover:text-foreground",
        )}
      >
        <Image
          src={item.image}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] shrink-0 object-contain"
        />
        {item.label}
      </Link>
    </li>
  );
}
