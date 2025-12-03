"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

/**
 * Global Error Boundary
 * Catches unhandled errors in the application
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>

        {/* Error Message */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Coś poszło nie tak
          </h1>
          <p className="text-muted-foreground">
            Wystąpił nieoczekiwany błąd podczas przetwarzania Twojego żądania.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === "development" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Szczegóły błędu (tylko DEV)</AlertTitle>
            <AlertDescription className="mt-2 font-mono text-xs">
              {error.message}
              {error.digest && (
                <div className="mt-2 text-muted-foreground">
                  Digest: {error.digest}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={reset} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Spróbuj ponownie
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>
            Jeśli problem się powtarza, skontaktuj się z{" "}
            <a
              href="mailto:support@example.com"
              className="font-medium text-primary hover:underline"
            >
              wsparciem technicznym
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}



