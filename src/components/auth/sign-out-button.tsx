'use client'

/**
 * Sign Out Button Component
 * 
 * Client component for signing out users
 * Uses NextAuth v5 signOutAction server action
 */

import { signOutAction } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useFormStatus } from "react-dom"

function SignOutButtonInner() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
    >
      <LogOut className="h-4 w-4" />
      {pending ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  )
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SignOutButtonInner />
    </form>
  )
}

