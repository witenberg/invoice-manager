"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateContractorForm } from "@/components/contractor/create-contractor-form";

interface CreateContractorButtonProps {
  companyId: number;
}

/**
 * Client component that manages contractor dialog state
 * Separated from server component page for optimal performance
 */
export function CreateContractorButton({ companyId }: CreateContractorButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Dodaj kontrahenta
      </Button>

      <CreateContractorForm
        companyId={companyId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

