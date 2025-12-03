import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogIn, Home } from "lucide-react";

/**
 * Unauthorized Access Page (401)
 * Displayed when user tries to access a protected resource
 */
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
          <ShieldAlert className="h-10 w-10 text-amber-500" />
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight text-amber-500">
            401
          </h1>
          <h2 className="text-2xl font-semibold">Brak autoryzacji</h2>
          <p className="text-muted-foreground">
            Nie masz uprawnień do przeglądania tej strony. Zaloguj się, aby
            uzyskać dostęp.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild variant="default">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Zaloguj się
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <div className="pt-8 text-sm text-muted-foreground">
          <p>
            Nie masz konta?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Zarejestruj się za darmo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

