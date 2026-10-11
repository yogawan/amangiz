"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface NotificationDTO {
  _id: string;
  title: string;
  message: string;
  resourceType?: "incident" | "batch" | "distribution";
  resourceId?: string;
  readAt?: string;
  createdAt: string;
}

const RESOURCE_BASE_HREF: Record<string, string> = {
  incident: "/app/incidents",
  batch: "/app/batches",
  distribution: "/app/distribution",
};

/**
 * Pure client-side (no services/*.service.ts involvement, unlike the rest of
 * the app): this is per-session UI state, not a Server Component read path.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDTO[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const { data } = await apiGet<{ unread: number }>(
          "/api/v1/notifications/unread-count",
        );
        setUnread(data.unread);
      } catch {
        // Keep the last known count — a silent miss here shouldn't toast.
      }
    }

    fetchUnreadCount();
    window.addEventListener("focus", fetchUnreadCount);
    return () => window.removeEventListener("focus", fetchUnreadCount);
  }, []);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next || notifications !== null) return;

    setLoading(true);
    try {
      const { data } = await apiGet<NotificationDTO[]>(
        "/api/v1/notifications?limit=10",
      );
      setNotifications(data);
    } catch {
      toast.error("Gagal memuat notifikasi.");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    setNotifications(
      (prev) =>
        prev?.map((item) =>
          item._id === id && !item.readAt
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ) ?? prev,
    );
    setUnread((count) => Math.max(0, count - 1));
    try {
      await apiPatch(`/api/v1/notifications/${id}/read`);
    } catch {
      toast.error("Gagal menandai notifikasi sebagai dibaca.");
    }
  }

  async function markAllRead() {
    const snapshot = notifications;
    const snapshotUnread = unread;
    setNotifications(
      (prev) =>
        prev?.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })) ?? prev,
    );
    setUnread(0);
    try {
      await apiPost("/api/v1/notifications/read-all");
    } catch {
      setNotifications(snapshot);
      setUnread(snapshotUnread);
      toast.error("Gagal menandai semua notifikasi sebagai dibaca.");
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Notifikasi"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifikasi</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tandai semua dibaca
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <p className="px-2 py-6 text-center text-sm text-text-secondary">
              Memuat...
            </p>
          )}
          {!loading && notifications?.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-text-secondary">
              Belum ada notifikasi.
            </p>
          )}
          {!loading &&
            notifications?.map((item) => {
              const href =
                item.resourceType && item.resourceId
                  ? `${RESOURCE_BASE_HREF[item.resourceType]}/${item.resourceId}`
                  : undefined;
              const isUnread = !item.readAt;
              const content = (
                <div
                  className={cn(
                    "flex flex-col gap-0.5 rounded-md px-2 py-2 text-sm",
                    isUnread && "bg-primary-light/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text-primary">
                      {item.title}
                    </p>
                    {isUnread && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">{item.message}</p>
                  <p className="text-[11px] text-text-muted">
                    {new Date(item.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              );

              return (
                <DropdownMenuItem
                  key={item._id}
                  asChild={Boolean(href)}
                  className="flex-col items-stretch gap-0 p-0 focus:bg-transparent"
                  onSelect={(event) => {
                    event.preventDefault();
                    if (isUnread) markRead(item._id);
                  }}
                >
                  {href ? <Link href={href}>{content}</Link> : content}
                </DropdownMenuItem>
              );
            })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
