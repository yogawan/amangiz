"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiPost } from "@/lib/api/client";
import type { AuthUser } from "@/lib/auth/current-user";
import { ORGANIZATION_TYPE_LABELS, ROLE_LABELS } from "./nav-items";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiPost("/api/v1/auth/logout");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
      setLoggingOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-primary-light">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden flex-col items-start sm:flex">
          <span className="text-sm font-semibold text-text-primary">
            {user.name}
          </span>
          <span className="text-xs text-text-secondary">
            {ROLE_LABELS[user.role]}
          </span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block font-semibold text-text-primary">
            {user.name}
          </span>
          <span className="block text-xs font-normal text-text-secondary">
            {ROLE_LABELS[user.role]} ·{" "}
            {ORGANIZATION_TYPE_LABELS[user.organizationType]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={loggingOut}
          onSelect={(event) => {
            event.preventDefault();
            handleLogout();
          }}
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Memproses..." : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
