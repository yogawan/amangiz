"use client";

import { useState } from "react";
import { ROLE_LABELS } from "@/components/layout/nav-items";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRole } from "@/models/User";

const DEMO_PASSWORD = "Password123!";

const DEMO_ACCOUNTS: { role: UserRole; email: string }[] = [
  { role: "admin", email: "admin@amangiz.test" },
  { role: "sppg_operator", email: "sppg.cempaka@amangiz.test" },
  { role: "school_operator", email: "sekolah.cikarang@amangiz.test" },
  { role: "investigator", email: "investigator@amangiz.test" },
];

export function DemoAccountsModal({
  onSelect,
}: {
  onSelect: (email: string, password: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demo Accounts</DialogTitle>
          <DialogDescription>
            Lingkungan sandbox untuk juri mencoba seluruh fitur AMANGIZ. Pilih
            salah satu akun untuk mengisi form login secara otomatis. Password
            semua akun:{" "}
            <span className="font-mono font-semibold text-foreground">
              {DEMO_PASSWORD}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {DEMO_ACCOUNTS.map(({ role, email }) => (
            <button
              key={email}
              type="button"
              onClick={() => {
                onSelect(email, DEMO_PASSWORD);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-left transition hover:border-primary/40 hover:bg-primary-light/30"
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {ROLE_LABELS[role]}
                </span>
                <span className="block font-mono text-xs text-muted">
                  {email}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-primary">
                Gunakan
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-semibold text-muted hover:text-foreground"
          >
            Tutup
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
