"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

/**
 * Global 404 Not Found Page
 * Displayed when a route doesn't exist
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <FileQuestion className="h-10 w-10 text-primary" />
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight text-primary">
            404
          </h1>
          <h2 className="text-2xl font-semibold">Strona nie istnieje</h2>
          <p className="text-muted-foreground">
            Przepraszamy, ale strona której szukasz nie została znaleziona.
            Mogła zostać przeniesiona lub usunięta.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild variant="default">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć
          </Button>
        </div>

        {/* Help Text */}
        <div className="pt-8 text-sm text-muted-foreground">
          <p>
            Potrzebujesz pomocy?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Zaloguj się
            </Link>
            {" "}lub{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              utwórz konto
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

