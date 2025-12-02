'use client'

import { useActionState } from "react";
import { createCompanyAction } from "../../app/actions/onboarding-actions";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";

export function CreateCompanyForm() {
  // Stan formularza obsługiwany przez Server Action
  const [state, action, isPending] = useActionState(createCompanyAction, null);

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
          
          {/* Błąd ogólny (np. błąd bazy danych) */}
          {state?.message && !state.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Błąd</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            {/* NIP */}
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <Input 
                id="nip" 
                name="nip" 
                placeholder="1234567890" 
                maxLength={10}
                required 
              />
              {state?.errors?.nip && (
                <p className="text-sm text-destructive">{state.errors.nip}</p>
              )}
            </div>

            {/* Nazwa */}
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa firmy</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Firma Sp. z o.o." 
                required 
              />
              {state?.errors?.name && (
                <p className="text-sm text-destructive">{state.errors.name}</p>
              )}
            </div>
          </div>

          <Separator className="my-2" />
          
          {/* Adres */}
          <div className="space-y-2">
            <Label>Adres siedziby</Label>
            <div className="grid grid-cols-6 gap-2">
              <Input name="street" placeholder="Ulica" className="col-span-4" required />
              <Input name="buildingNumber" placeholder="Nr" className="col-span-2" required />
            </div>
            <div className="grid grid-cols-6 gap-2">
              <Input name="postalCode" placeholder="Kod (00-000)" className="col-span-2" required />
              <Input name="city" placeholder="Miejscowość" className="col-span-4" required />
            </div>
          </div>

          <Separator className="my-2" />

          {/* Sekcja KSeF */}
          <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
            <div className="mb-3 space-y-1">
              <Label htmlFor="ksefToken" className="text-blue-900 dark:text-blue-100">
                Token Autoryzacyjny KSeF
              </Label>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Wklej token wygenerowany w aplikacji Ministerstwa Finansów (Test).
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
            />
            {state?.errors?.ksefToken && (
              <p className="mt-1 text-sm text-destructive">{state.errors.ksefToken}</p>
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