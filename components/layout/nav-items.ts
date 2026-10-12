import type { OrganizationType, UserRole } from "@/models/User";

export interface NavItem {
  href: string;
  label: string;
  image: string;
  roles: readonly UserRole[];
}

/** Primary sitemap (PRD §9.1), gated per the permission matrix (PRD §3.2). */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/app/dashboard",
    label: "Dashboard",
    image: "/sidebar-dashboard.png",
    roles: ["admin", "sppg_operator", "school_operator", "investigator"],
  },
  {
    href: "/app/batches",
    label: "Batch Makanan",
    image: "/sidebar-batch-makanan.png",
    roles: ["admin", "sppg_operator", "school_operator", "investigator"],
  },
  {
    href: "/app/traceability",
    label: "Traceability",
    image: "/sidebar-traceability.png",
    roles: ["admin", "sppg_operator", "school_operator", "investigator"],
  },
  {
    href: "/app/distribution",
    label: "Distribusi",
    image: "/sidebar-distribusi.png",
    roles: ["admin", "sppg_operator", "school_operator", "investigator"],
  },
  {
    href: "/app/incidents",
    label: "Insiden",
    image: "/sidebar-insiden.png",
    roles: ["admin", "sppg_operator", "school_operator", "investigator"],
  },
  {
    href: "/app/risk-analysis",
    label: "Analisis Risiko",
    image: "/sidebar-analisis-resiko.png",
    // PRD §3.2: Risk Assessment has no access row for School Operator.
    roles: ["admin", "sppg_operator", "investigator"],
  },
  {
    href: "/app/investigations",
    label: "Investigasi",
    image: "/sidebar-investigasi.png",
    // PRD §3.2: Investigation is Admin full / Investigator assigned-or-full only.
    roles: ["admin", "investigator"],
  },
  {
    href: "/app/users",
    label: "Pengguna & Master Data",
    image: "/sidebar-pengguna.png",
    // PRD §9.2 #10: "Akses hanya tersedia bagi Administrator."
    roles: ["admin"],
  },
] as const;

/** Secondary pages, not counted in the 10-page sitemap (PRD §9.1 note, UI_PLAN §0.1). */
export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/app/audit-log",
    label: "Audit Log",
    image: "/Activity history.png",
    roles: ["admin", "investigator"],
  },
] as const;

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function secondaryNavItemsForRole(role: UserRole): NavItem[] {
  return SECONDARY_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  sppg_operator: "Operator SPPG",
  school_operator: "Operator Sekolah",
  investigator: "Investigator",
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  system: "Sistem",
  sppg: "SPPG",
  school: "Sekolah",
  health_authority: "Otoritas Kesehatan",
};
