"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import Link from "next/link";
import type { InvitationWithCompany } from "../../modules/company/invitation-service";

interface InvitationsListProps {
  invitations: InvitationWithCompany[];
}

/**
 * Displays a list of pending company invitations
 * Shows invitation details and links to acceptance page
 */
export function InvitationsList({ invitations }: InvitationsListProps) {
  // Early return if no invitations (shouldn't happen due to parent check, but defensive)
  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium text-amber-900">
          Oczekujące zaproszenia ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
          >
            <div className="space-y-1">
              <p className="font-medium leading-none">
                {inv.companyName || "Nieznana firma"}
              </p>
              <div className="flex gap-2 text-sm text-muted-foreground">
                Rola:{" "}
                <Badge variant="secondary" className="text-xs">
                  {inv.role}
                </Badge>
              </div>
            </div>

            <Button asChild size="sm" variant="default">
              <Link href={`/invite/${encodeURIComponent(inv.token)}`}>
                Zobacz
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}