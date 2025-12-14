"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Configuration for sidebar navigation items
 * Add your navigation items here: name + url
 */
export const SIDEBAR_NAV_ITEMS = [
  {
    name: "Dashboard",
    url: "/dashboard",
  },
  {
    name: "Faktury",
    url: "/dashboard/invoices",
  },
  {
    name: "Kontrahenci",
    url: "/dashboard/contractors",
  },
  {
    name: "Ustawienia",
    url: "/dashboard/settings",
  },
] as const;

/**
 * Dashboard Sidebar Component
 * Displays navigation menu with configurable items
 */
export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <h2 className="text-lg font-semibold">Invoice Manager</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                    >
                      <Link href={item.url}>
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
