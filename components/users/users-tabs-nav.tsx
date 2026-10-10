"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "users", label: "Users" },
  { value: "sppg", label: "SPPG" },
  { value: "suppliers", label: "Suppliers" },
  { value: "schools", label: "Schools" },
] as const;

export function UsersTabsNav({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Tabs
      value={active}
      onValueChange={(value) => router.push(`${pathname}?tab=${value}`)}
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
