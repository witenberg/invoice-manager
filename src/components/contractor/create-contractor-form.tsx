"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  createContractorAction,
  type ContractorActionState,
} from "@/app/actions/contractor-actions";

/**
 * Validation schema for contractor form
 */
const contractorFormSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć co najmniej 2 znaki"),
  nip: z.union([
    z.string().regex(/^[0-9]{10}$/, "NIP musi składać się z 10 cyfr"),
    z.literal(""),
  ]).optional(),
  email: z.union([
    z.string().email("Nieprawidłowy format adresu email"),
    z.literal(""),
  ]).optional(),
  isVatPayer: z.boolean(),
  street: z.string().min(1, "Ulica jest wymagana"),
  buildingNumber: z.string().min(1, "Numer budynku jest wymagany"),
  flatNumber: z.union([z.string(), z.literal("")]).optional(),
  city: z.string().min(1, "Miasto jest wymagane"),
  postalCode: z
    .string()
    .regex(/^[0-9]{2}-[0-9]{3}$/, "Kod pocztowy musi być w formacie XX-XXX"),
  countryCode: z.string(),
});

type ContractorFormData = z.infer<typeof contractorFormSchema>;

interface CreateContractorFormProps {
  companyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create Contractor Form
 * Form for creating a new contractor with validation
 * 
 * Features:
 * - React Hook Form with Zod validation
 * - Server Action submission with useActionState
 * - Dialog-based UI
 */
export function CreateContractorForm({
  companyId,
  open,
  onOpenChange,
}: CreateContractorFormProps) {
  const [isPending, startTransition] = useTransition();

  // Initialize form with React Hook Form
  const form = useForm<ContractorFormData>({
    resolver: zodResolver(contractorFormSchema),
    defaultValues: {
      name: "",
      nip: "",
      email: "",
      isVatPayer: true,
      street: "",
      buildingNumber: "",
      flatNumber: "",
      city: "",
      postalCode: "",
      countryCode: "PL",
    },
  });

  // Server Action state
  const [actionState, formAction] = useActionState<
    ContractorActionState,
    FormData
  >(createContractorAction.bind(null, companyId), null);

  // Handle action state changes
  useEffect(() => {
    if (actionState?.success) {
      // Success: close dialog and reset form
      form.reset();
      onOpenChange(false);
    }
  }, [actionState, form, onOpenChange]);

  // Handle form submission
  const onSubmit = form.handleSubmit((data: ContractorFormData) => {
    // Create FormData
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.nip) formData.append("nip", data.nip);
    if (data.email) formData.append("email", data.email);
    formData.append("isVatPayer", String(data.isVatPayer));
    formData.append("street", data.street);
    formData.append("buildingNumber", data.buildingNumber);
    if (data.flatNumber) formData.append("flatNumber", data.flatNumber);
    formData.append("city", data.city);
    formData.append("postalCode", data.postalCode);
    formData.append("countryCode", data.countryCode);

    // Submit via Server Action
    startTransition(() => {
      formAction(formData);
    });
  });

  // Helper to get field error
  const getFieldError = (fieldName: keyof ContractorFormData) => {
    // Check React Hook Form errors first
    const formError = form.formState.errors[fieldName];
    if (formError) return formError.message;

    // Check server-side errors
    if (actionState?.errors?.[fieldName]) {
      return actionState.errors[fieldName][0];
    }

    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj kontrahenta</DialogTitle>
          <DialogDescription>
            Wprowadź dane kontrahenta. Pola oznaczone * są wymagane.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Action State Messages */}
          {actionState?.message && !actionState.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{actionState.message}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Dane podstawowe</h3>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nazwa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nazwa kontrahenta"
                aria-invalid={!!getFieldError("name")}
              />
              {getFieldError("name") && (
                <p className="text-sm text-destructive">
                  {getFieldError("name")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nip">NIP</Label>
                <Input
                  id="nip"
                  {...form.register("nip")}
                  placeholder="1234567890"
                  maxLength={10}
                  aria-invalid={!!getFieldError("nip")}
                />
                {getFieldError("nip") && (
                  <p className="text-sm text-destructive">
                    {getFieldError("nip")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="kontakt@firma.pl"
                  aria-invalid={!!getFieldError("email")}
                />
                {getFieldError("email") && (
                  <p className="text-sm text-destructive">
                    {getFieldError("email")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isVatPayer"
                {...form.register("isVatPayer")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isVatPayer" className="font-normal">
                Płatnik VAT
              </Label>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Adres</h3>

            <div className="space-y-2">
              <Label htmlFor="street">
                Ulica <span className="text-destructive">*</span>
              </Label>
              <Input
                id="street"
                {...form.register("street")}
                placeholder="ul. Kwiatowa"
                aria-invalid={!!getFieldError("street")}
              />
              {getFieldError("street") && (
                <p className="text-sm text-destructive">
                  {getFieldError("street")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buildingNumber">
                  Numer budynku <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="buildingNumber"
                  {...form.register("buildingNumber")}
                  placeholder="10"
                  aria-invalid={!!getFieldError("buildingNumber")}
                />
                {getFieldError("buildingNumber") && (
                  <p className="text-sm text-destructive">
                    {getFieldError("buildingNumber")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="flatNumber">Numer lokalu</Label>
                <Input
                  id="flatNumber"
                  {...form.register("flatNumber")}
                  placeholder="5"
                  aria-invalid={!!getFieldError("flatNumber")}
                />
                {getFieldError("flatNumber") && (
                  <p className="text-sm text-destructive">
                    {getFieldError("flatNumber")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">
                  Kod pocztowy <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="postalCode"
                  {...form.register("postalCode")}
                  placeholder="00-000"
                  maxLength={6}
                  aria-invalid={!!getFieldError("postalCode")}
                />
                {getFieldError("postalCode") && (
                  <p className="text-sm text-destructive">
                    {getFieldError("postalCode")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  Miasto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  placeholder="Warszawa"
                  aria-invalid={!!getFieldError("city")}
                />
                {getFieldError("city") && (
                  <p className="text-sm text-destructive">
                    {getFieldError("city")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryCode">
                Kod kraju <span className="text-destructive">*</span>
              </Label>
              <Input
                id="countryCode"
                {...form.register("countryCode")}
                placeholder="PL"
                maxLength={2}
                aria-invalid={!!getFieldError("countryCode")}
              />
              {getFieldError("countryCode") && (
                <p className="text-sm text-destructive">
                  {getFieldError("countryCode")}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                "Dodaj kontrahenta"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

