"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { acceptInvitationAction } from "../../../app/actions/invitation-actions";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import type { InvitationWithCompany } from "../../../modules/company/invitation-service";

interface InviteViewProps {
  invitation: InvitationWithCompany;
  isAuthenticated: boolean;
  userName?: string | null;
}

/**
 * Client component for invitation acceptance view
 * Handles user interaction and displays invitation details
 */
export function InviteView({
  invitation,
  isAuthenticated,
  userName,
}: InviteViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles invitation acceptance
   * Calls server action and handles errors
   */
  const onAccept = async () => {
    // Prevent double submission
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Call server action
      const result = await acceptInvitationAction(invitation.token);

      // If action returned an object (no redirect = error occurred)
      if (result?.error) {
        setError(result.error);
        setIsProcessing(false);
      }
      // If redirect occurred, React will unmount this component
    } catch (err) {
      // Catch any unexpected errors
      setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          🏢
        </div>
        <CardTitle className="text-2xl">Zaproszenie do współpracy</CardTitle>
        <CardDescription>
          Zostałeś zaproszony do dołączenia do organizacji
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 text-center">
        <div className="rounded-lg bg-secondary/50 p-4 border">
          <p className="text-sm text-muted-foreground">Nazwa Firmy</p>
          <p className="text-lg font-semibold">{invitation.companyName}</p>
        </div>

        <div className="flex justify-center gap-2 items-center">
          <span className="text-sm text-muted-foreground">Twoja rola:</span>
          <Badge variant="secondary" className="uppercase">
            {invitation.role}
          </Badge>
        </div>

        {isAuthenticated ? (
          <p className="text-sm text-muted-foreground">
            Zalogowany jako{" "}
            <span className="font-medium text-foreground">
              {userName || "Użytkownik"}
            </span>
          </p>
        ) : (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              Musisz się zalogować, aby zaakceptować zaproszenie.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {isAuthenticated ? (
          <Button
            onClick={onAccept}
            className="w-full"
            disabled={isProcessing}
            aria-busy={isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? "Dołączanie..." : "Akceptuję i dołączam"}
          </Button>
        ) : (
          <Button asChild className="w-full" variant="default">
            <Link
              href={`/api/auth/signin?callbackUrl=/invite/${encodeURIComponent(invitation.token)}`}
            >
              Zaloguj się / Rejestracja
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}