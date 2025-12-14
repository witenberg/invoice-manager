"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/contexts/company-context";
import { getCompanyInvoicesAction } from "@/app/actions/invoice-actions";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KsefStatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Loader2 } from "lucide-react";
import { formatDateShort, formatCurrency } from "@/lib/format-utils";
import type { invoices } from "@/db/schema";

type Invoice = typeof invoices.$inferSelect;

/**
 * Invoices Page
 * Displays list of invoices for the currently selected company
 */
export default function InvoicesPage() {
  const { selectedCompany, selectedCompanyId, isLoading: isCompanyLoading } =
    useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      if (!selectedCompanyId) {
        setIsLoading(false);
        setInvoices([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getCompanyInvoicesAction(selectedCompanyId);
        setInvoices(data);
      } catch (err) {
        console.error("Failed to load invoices:", err);
        setError(
          "Nie udało się załadować faktur. Spróbuj odświeżyć stronę."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadInvoices();
  }, [selectedCompanyId]);

  // Show loading state while company is loading
  if (isCompanyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show message if no company is selected
  if (!selectedCompany) {
    return (
      <>
        <PageHeader
          title="Faktury"
          description="Wybierz firmę, aby zobaczyć faktury"
        />
        <EmptyState
          icon={FileText}
          title="Brak wybranej firmy"
          description="Wybierz firmę z menu powyżej, aby zobaczyć listę faktur."
        />
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <PageHeader
          title="Faktury"
          description={`Faktury dla firmy: ${selectedCompany.name}`}
        />
        <div className="mt-8 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Faktury"
          description={`Faktury dla firmy: ${selectedCompany.name}`}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  // Show empty state
  if (invoices.length === 0) {
    return (
      <>
        <PageHeader
          title="Faktury"
          description={`Faktury dla firmy: ${selectedCompany.name}`}
        />
        <EmptyState
          icon={FileText}
          title="Brak faktur"
          description={`Nie znaleziono żadnych faktur dla firmy ${selectedCompany.name}.`}
        />
      </>
    );
  }

  // Get invoice type label
  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case "VAT":
        return "VAT";
      case "CORRECTION":
        return "Korekta";
      case "ADVANCE":
        return "Zaliczka";
      default:
        return type;
    }
  };

  return (
    <>
      <PageHeader
        title="Faktury"
        description={`Faktury dla firmy: ${selectedCompany.name}`}
      />

      <div className="mt-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numer faktury</TableHead>
              <TableHead>Data wystawienia</TableHead>
              <TableHead>Kontrahent</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Kwota brutto</TableHead>
              <TableHead>Status KSeF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.number}</TableCell>
                <TableCell>{formatDateShort(invoice.issueDate)}</TableCell>
                <TableCell>{invoice.buyerNameSnapshot}</TableCell>
                <TableCell>{getInvoiceTypeLabel(invoice.type)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(invoice.totalGross, invoice.currency)}
                </TableCell>
                <TableCell>
                  <KsefStatusBadge status={invoice.ksefStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
