"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateInvoiceForm } from "@/components/invoice/create-invoice-form";
import type { Company } from "@/types/database-types";

interface CreateInvoiceButtonProps {
  companyId: number;
  company: Company;
}

/**
 * Client component that manages invoice dialog state
 * Separated from server component page for optimal performance
 */
export function CreateInvoiceButton({ companyId, company }: CreateInvoiceButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Nowa faktura
      </Button>

      <CreateInvoiceForm
        companyId={companyId}
        company={company}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

