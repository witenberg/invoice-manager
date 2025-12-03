import { requireAuth } from "@/lib/route-guards";
import { CompanyService } from "@/modules/company/company-service";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Users } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

/**
 * Dashboard Page
 * Main dashboard for authenticated users with companies
 */
export default async function DashboardPage() {
  const session = await requireAuth();

  // Get user companies
  const companyService = new CompanyService();
  const companies = await companyService.findUserCompanies(session.user.id);

  // If no companies, redirect to onboarding
  if (companies.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="container py-10 space-y-8 mx-auto">
      <PageHeader
        title="Dashboard"
        description={`Witaj, ${session.user.name || "Użytkowniku"}!`}
      >
        <SignOutButton />
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmy</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">
              Zarządzasz {companies.length === 1 ? "firmą" : "firmami"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faktury</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">W tym miesiącu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Członkowie</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Aktywni użytkownicy</p>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Twoje firmy</h2>
          <Button asChild>
            <Link href="/onboarding">Dodaj firmę</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <CardTitle>{company.name}</CardTitle>
                <CardDescription>NIP: {company.nip}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {company.addressData.city},{" "}
                    {company.addressData.postalCode}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/dashboard/companies/${company.id}`}>
                      Zarządzaj
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

