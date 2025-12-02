'use client'

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { acceptInvitationAction } from "../../../app/actions/invitation-actions";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { InvitationWithCompany } from "../../../modules/company/invitation-service";

interface InviteViewProps {
  invitation: InvitationWithCompany;
  isAuthenticated: boolean;
  userName?: string | null;
}

export function InviteView({ invitation, isAuthenticated, userName }: InviteViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAccept = async () => {
    setIsProcessing(true);
    setError(null);
    
    // Wywołanie Server Action
    const result = await acceptInvitationAction(invitation.token);
    
    // Jeśli akcja zwróciła obiekt (tzn. że nie było redirectu = błąd)
    if (result?.error) {
        setError(result.error);
        setIsProcessing(false);
    }
    // Jeśli był redirect, React przerwie renderowanie tego komponentu, więc else nie jest potrzebny
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
            <Badge variant="secondary" className="uppercase">{invitation.role}</Badge>
        </div>

        {isAuthenticated ? (
           <p className="text-sm text-muted-foreground">
             Zalogowany jako <span className="font-medium text-foreground">{userName}</span>
           </p>
        ) : (
           <p className="text-sm text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-200">
             Musisz się zalogować, aby zaakceptować zaproszenie.
           </p>
        )}

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {isAuthenticated ? (
          <Button onClick={onAccept} className="w-full" disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? "Dołączanie..." : "Akceptuję i dołączam"}
          </Button>
        ) : (
          <Button asChild className="w-full" variant="default">
            <Link href={`/api/auth/signin?callbackUrl=/invite/${invitation.token}`}>
              Zaloguj się / Rejestracja
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}