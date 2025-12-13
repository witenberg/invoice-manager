import { requireAuth } from "@/lib/route-guards";
import { CompanyService } from "@/modules/company/company-service";
import { ContractorService } from "@/modules/contractor/contractor-service";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Plus, Users } from "lucide-react";
import Link from "next/link";
import { CreateInvoiceButton } from "./create-invoice-button";
import { CreateContractorButton } from "./create-contractor-button";
import { ContractorsList } from "@/components/contractor/contractors-list";

interface CompanyPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Company Details Page
 * Displays company information and management options
 */
export default async function CompanyPage({ params }: CompanyPageProps) {
  const session = await requireAuth();
  const { id } = await params;
  const companyId = parseInt(id, 10);

  // Validate company ID
  if (isNaN(companyId)) {
    notFound();
  }

  // Get company data (with access verification)
  const companyService = new CompanyService();
  const contractorService = new ContractorService();
  let company;
  let contractors;
  
  try {
    company = await companyService.findById(session.user.id, companyId);
    contractors = await contractorService.findByCompanyId(companyId);
  } catch (error) {
    // If company not found or no access, show 404
    notFound();
  }

  return (
    <div className="container py-10 space-y-8 mx-auto">
      <PageHeader
        title={company.name}
        description={`Zarządzanie firmą`}
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard">Powrót do dashboard</Link>
        </Button>
      </PageHeader>

      {/* Company Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informacje o firmie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">NIP</p>
              <p className="text-lg font-semibold">{company.nip}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Adres</p>
              <p className="text-base">
                {company.addressData.street} {company.addressData.buildingNumber}
                <br />
                {company.addressData.postalCode} {company.addressData.city}
                <br />
                {company.addressData.countryCode}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data utworzenia</p>
              <p className="text-base">
                {company.createdAt && new Date(company.createdAt).toLocaleDateString("pl-PL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Akcje
            </CardTitle>
            <CardDescription>Zarządzaj fakturami i dokumentami</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateInvoiceButton companyId={companyId} company={company} />
          </CardContent>
        </Card>
      </div>

      {/* Contractors Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Kontrahenci
              </CardTitle>
              <CardDescription>
                Lista kontrahentów dla tej firmy
              </CardDescription>
            </div>
            <CreateContractorButton companyId={companyId} />
          </div>
        </CardHeader>
        <CardContent>
          <ContractorsList contractors={contractors} companyId={companyId} />
        </CardContent>
      </Card>
    </div>
  );
}

