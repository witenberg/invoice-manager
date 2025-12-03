import { Construction } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

/**
 * Maintenance Mode Banner
 * Display when system is under maintenance
 */
export function MaintenanceBanner() {
  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
      <Construction className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Prace konserwacyjne
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        System jest obecnie w trakcie konserwacji. Niektóre funkcje mogą być
        niedostępne.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Full Page Maintenance Mode
 */
export function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
          <Construction className="h-10 w-10 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Prace konserwacyjne
          </h1>
          <p className="text-muted-foreground">
            System jest obecnie niedostępny z powodu planowanych prac
            konserwacyjnych. Przepraszamy za niedogodności.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium">Szacowany czas przywrócenia:</p>
          <p className="text-muted-foreground">Ok. 30 minut</p>
        </div>

        <div className="pt-4 text-sm text-muted-foreground">
          <p>
            Aktualizacje na{" "}
            <a
              href="https://status.example.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              stronie statusu
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

