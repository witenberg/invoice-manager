"use client";

import { useActionState, useState, useEffect } from "react";
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
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import type { OnboardingActionState, OnboardingStage } from "../../types/action-types";

/**
 * Form component for creating a new company with KSeF integration
 * Uses React 19 useActionState hook for progressive enhancement
 * Implements progressive UI feedback based on processing stage
 */
export function CreateCompanyForm() {
  const [state, action, isPending] = useActionState<
    OnboardingActionState | null,
    FormData
  >(createCompanyAction, null);

  // Track the current stage for UI feedback
  const [currentStage, setCurrentStage] = useState<OnboardingStage>("idle");

  // Update stage based on isPending and timing
  useEffect(() => {
    if (!isPending) {
      setCurrentStage("idle");
      return;
    }

    // Stage 1: Form validation (immediate, ~100ms)
    setCurrentStage("validating_form");

    // Stage 2: KSeF token validation (after 300ms, indicates we passed form validation)
    const ksefTimer = setTimeout(() => {
      setCurrentStage("validating_ksef");
    }, 300);

    // Stage 3: Creating company (after 2s, indicates KSeF validation is ongoing)
    const companyTimer = setTimeout(() => {
      setCurrentStage("creating_company");
    }, 2000);

    return () => {
      clearTimeout(ksefTimer);
      clearTimeout(companyTimer);
    };
  }, [isPending]);

  /**
   * Helper to get field-specific error message
   */
  const getFieldError = (fieldName: string): string | undefined => {
    return state?.errors?.[fieldName]?.[0];
  };

  /**
   * Get UI feedback message based on current processing stage
   */
  const getStageMessage = () => {
    switch (currentStage) {
      case "validating_form":
        return {
          title: "Sprawdzanie danych...",
          description: "Walidujemy wprowadzone informacje.",
          icon: Loader2,
        };
      case "validating_ksef":
        return {
          title: "Weryfikacja tokena KSeF...",
          description: "Łączymy się z systemem KSeF. To może potrwać do 30 sekund.",
          icon: Loader2,
        };
      case "creating_company":
        return {
          title: "Tworzenie firmy...",
          description: "Zapisujemy dane w systemie.",
          icon: CheckCircle,
        };
      default:
        return null;
    }
  };

  return (
    <form action={action} noValidate>
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

          {/* Progressive stage feedback */}
          {isPending && (() => {
            const stageInfo = getStageMessage();
            if (!stageInfo) return null;
            const StageIcon = stageInfo.icon;
            return (
              <Alert>
                <StageIcon className={`h-4 w-4 ${stageInfo.icon === Loader2 ? 'animate-spin' : ''}`} />
                <AlertTitle>{stageInfo.title}</AlertTitle>
                <AlertDescription>{stageInfo.description}</AlertDescription>
              </Alert>
            );
          })()}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* NIP field */}
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                name="nip"
                placeholder="1234567890"
                maxLength={10}
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
              <div className="col-span-4 space-y-1">
                <Input
                  name="street"
                  placeholder="Ulica"
                  aria-label="Ulica"
                  aria-invalid={!!getFieldError("street")}
                  aria-describedby={getFieldError("street") ? "street-error" : undefined}
                />
                {getFieldError("street") && (
                  <p id="street-error" className="text-xs text-destructive">
                    {getFieldError("street")}
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <Input
                  name="buildingNumber"
                  placeholder="Nr"
                  aria-label="Numer budynku"
                  aria-invalid={!!getFieldError("buildingNumber")}
                  aria-describedby={getFieldError("buildingNumber") ? "buildingNumber-error" : undefined}
                />
                {getFieldError("buildingNumber") && (
                  <p id="buildingNumber-error" className="text-xs text-destructive">
                    {getFieldError("buildingNumber")}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-2 space-y-1">
                <Input
                  name="postalCode"
                  placeholder="00-000"
                  aria-label="Kod pocztowy"
                  aria-invalid={!!getFieldError("postalCode")}
                  aria-describedby={getFieldError("postalCode") ? "postalCode-error" : undefined}
                />
                {getFieldError("postalCode") && (
                  <p id="postalCode-error" className="text-xs text-destructive">
                    {getFieldError("postalCode")}
                  </p>
                )}
              </div>
              <div className="col-span-4 space-y-1">
                <Input
                  name="city"
                  placeholder="Miejscowość"
                  aria-label="Miejscowość"
                  aria-invalid={!!getFieldError("city")}
                  aria-describedby={getFieldError("city") ? "city-error" : undefined}
                />
                {getFieldError("city") && (
                  <p id="city-error" className="text-xs text-destructive">
                    {getFieldError("city")}
                  </p>
                )}
              </div>
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
              placeholder="Wklej token..."
              autoComplete="off"
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
            {isPending 
              ? currentStage === "validating_form" 
                ? "Sprawdzanie danych..." 
                : currentStage === "validating_ksef"
                ? "Weryfikowanie tokena KSeF..."
                : "Tworzenie firmy..."
              : "Załóż firmę i połącz z KSeF"
            }
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}