"use client";

import { FileText, Edit, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InvoiceTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: "VAT" | "CORRECTION" | "ADVANCE") => void;
}

/**
 * Invoice Type Selector
 * Modal for selecting invoice type before creating
 * 
 * Types:
 * - VAT: Standard invoice
 * - CORRECTION: Correction invoice
 * - ADVANCE: Advance payment invoice
 */
export function InvoiceTypeSelector({
  open,
  onOpenChange,
  onSelectType,
}: InvoiceTypeSelectorProps) {
  const handleSelect = (type: "VAT" | "CORRECTION" | "ADVANCE") => {
    onSelectType(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Wybierz typ faktury</DialogTitle>
          <DialogDescription>
            Wybierz rodzaj dokumentu, który chcesz wystawić
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 md:grid-cols-3">
          {/* VAT Invoice */}
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => handleSelect("VAT")}
          >
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">Faktura VAT</CardTitle>
              <CardDescription>Standardowa faktura sprzedaży</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => handleSelect("VAT")}>
                Wybierz
              </Button>
            </CardContent>
          </Card>

          {/* Correction Invoice */}
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => handleSelect("CORRECTION")}
          >
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Edit className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-base">Faktura Korygująca</CardTitle>
              <CardDescription>Korekta wcześniej wystawionej faktury</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => handleSelect("CORRECTION")}>
                Wybierz
              </Button>
            </CardContent>
          </Card>

          {/* Advance Invoice */}
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => handleSelect("ADVANCE")}
          >
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-base">Faktura Zaliczkowa</CardTitle>
              <CardDescription>Zaliczka na poczet przyszłej dostawy</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => handleSelect("ADVANCE")}>
                Wybierz
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

