import { requireAuth } from "@/lib/route-guards";
import { CompanyProvider } from "@/contexts/company-context";
import { CompanySelectorWrapper } from "@/components/company/company-selector-wrapper";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * Dashboard Layout
 * Provides company selector context and sidebar navigation for all dashboard pages
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <CompanyProvider>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
          {/* Header with Sidebar Trigger and Company Selector */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex h-14 items-center gap-4 px-4">
              <SidebarTrigger />
              <div className="flex items-center gap-4 flex-1 justify-end">
                <CompanySelectorWrapper />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container py-6 mx-auto px-4">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </CompanyProvider>
  );
}

