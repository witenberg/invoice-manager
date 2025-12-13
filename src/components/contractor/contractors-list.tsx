"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Mail, Building2, Loader2 } from "lucide-react";
import type { Contractor } from "@/types/database-types";
import { deleteContractorAction } from "@/app/actions/contractor-actions";
import { useRouter } from "next/navigation";

interface ContractorsListProps {
  contractors: Contractor[];
  companyId: number;
}

/**
 * Contractors List Component
 * Displays a table of contractors with delete functionality
 */
export function ContractorsList({
  contractors,
  companyId,
}: ContractorsListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (contractor: Contractor) => {
    if (!confirm(`Czy na pewno chcesz usunąć kontrahenta "${contractor.name}"?`)) {
      return;
    }

    setDeletingId(contractor.id);
    try {
      const result = await deleteContractorAction(companyId, contractor.id);

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Wystąpił błąd podczas usuwania kontrahenta.");
    } finally {
      setDeletingId(null);
    }
  };

  if (contractors.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Brak kontrahentów</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Dodaj pierwszego kontrahenta, aby rozpocząć wystawianie faktur.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Miasto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.map((contractor) => (
              <TableRow key={contractor.id}>
                <TableCell className="font-medium">{contractor.name}</TableCell>
                <TableCell>{contractor.nip || "—"}</TableCell>
                <TableCell>{contractor.addressData.city}</TableCell>
                <TableCell>
                  {contractor.email ? (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="text-xs">{contractor.email}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {contractor.isVatPayer ? (
                    <span className="text-green-600 text-xs">Tak</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Nie</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(contractor)}
                    disabled={deletingId === contractor.id}
                  >
                    {deletingId === contractor.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

