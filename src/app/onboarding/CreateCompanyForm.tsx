"use client";

import { useActionState } from "react";
import { createCompanyAction } from "../../app/actions/onboarding-actions";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";
import type { OnboardingActionState } from "../../types/action-types";

/**
 * Form component for creating a new company with KSeF integration
 * Uses React 19 useActionState hook for progressive enhancement
 */
export function CreateCompanyForm() {
  const [state, action, isPending] = useActionState<
    OnboardingActionState | null,
    FormData
  >(createCompanyAction, null);

  /**
   * Helper to get field-specific error message
   */
  const getFieldError = (fieldName: string): string | undefined => {
    return state?.errors?.[fieldName]?.[0];
  };

  return (
    <form action={action}>
      <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle>Dane firmy</CardTitle>
          <CardDescription>
            Wprowadź dane swojej firmy, aby rozpocząć wystawianie faktur.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* General error message (e.g., database error) */}
          {state?.message && !state.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Błąd</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* NIP field */}
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                name="nip"
                placeholder="1234567890"
                maxLength={10}
                required
                aria-invalid={!!getFieldError("nip")}
                aria-describedby={getFieldError("nip") ? "nip-error" : undefined}
              />
              {getFieldError("nip") && (
                <p id="nip-error" className="text-sm text-destructive">
                  {getFieldError("nip")}
                </p>
              )}
            </div>

            {/* Company name field */}
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa firmy</Label>
              <Input
                id="name"
                name="name"
                placeholder="Firma Sp. z o.o."
                required
                aria-invalid={!!getFieldError("name")}
                aria-describedby={getFieldError("name") ? "name-error" : undefined}
              />
              {getFieldError("name") && (
                <p id="name-error" className="text-sm text-destructive">
                  {getFieldError("name")}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-2" />

          {/* Address section */}
          <div className="space-y-2">
            <Label>Adres siedziby</Label>
            <div className="grid grid-cols-6 gap-2">
              <Input
                name="street"
                placeholder="Ulica"
                className="col-span-4"
                required
                aria-label="Ulica"
              />
              <Input
                name="buildingNumber"
                placeholder="Nr"
                className="col-span-2"
                required
                aria-label="Numer budynku"
              />
            </div>
            <div className="grid grid-cols-6 gap-2">
              <Input
                name="postalCode"
                placeholder="Kod (00-000)"
                className="col-span-2"
                required
                aria-label="Kod pocztowy"
              />
              <Input
                name="city"
                placeholder="Miejscowość"
                className="col-span-4"
                required
                aria-label="Miejscowość"
              />
            </div>
          </div>

          <Separator className="my-2" />

          {/* KSeF token section */}
          <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
            <div className="mb-3 space-y-1">
              <Label
                htmlFor="ksefToken"
                className="text-blue-900 dark:text-blue-100"
              >
                Token Autoryzacyjny KSeF
              </Label>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Wklej token wygenerowany w aplikacji Ministerstwa Finansów
                (Test).
              </p>
            </div>

            <Input
              id="ksefToken"
              name="ksefToken"
              type="password"
              className="bg-white dark:bg-slate-950"
              placeholder="3084..."
              autoComplete="off"
              required
              minLength={30}
              aria-invalid={!!getFieldError("ksefToken")}
              aria-describedby={
                getFieldError("ksefToken") ? "ksefToken-error" : undefined
              }
            />
            {getFieldError("ksefToken") && (
              <p id="ksefToken-error" className="mt-1 text-sm text-destructive">
                {getFieldError("ksefToken")}
              </p>
            )}
          </div>

        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Konfigurowanie..." : "Załóż firmę i połącz z KSeF"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}