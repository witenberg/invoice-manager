'use client'

/**
 * Login Form Component
 * 
 * Client component for user authentication
 * Uses React 19 useActionState hook with Next.js server actions
 */

import { useActionState, useEffect } from "react"
import { loginAction, type LoginState } from "@/app/actions/auth-actions"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { signIn } from "next-auth/react"

interface LoginFormProps {
    showRegisteredMessage?: boolean
    callbackUrl?: string
}

export function LoginForm({ showRegisteredMessage, callbackUrl }: LoginFormProps) {
    const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(
        loginAction,
        null
    )

    useEffect(() => {
        if (state?.success) {
            // Success feedback could be handled here if needed
        }
    }, [state?.success])

    const handleGoogleSignIn = async () => {
        await signIn("google", { callbackUrl: "/onboarding" })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Logowanie</CardTitle>
            </CardHeader>
            <CardContent>
                {showRegisteredMessage && (
                    <Alert className="mb-4">
                        <AlertDescription>
                            🎉 Konto zostało utworzone! Zaloguj się aby kontynuować.
                        </AlertDescription>
                    </Alert>
                )}

                {state?.message && !state.success && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>
                            {state.message}
                        </AlertDescription>
                    </Alert>
                )}

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="twoj@email.pl"
                            required
                            autoComplete="email"
                            aria-invalid={!!state?.errors?.email}
                        />
                        {state?.errors?.email && (
                            <p className="text-sm text-destructive">
                                {state.errors.email[0]}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Hasło</Label>
                            {/* Future: Add forgot password link */}
                        </div>
                        <PasswordInput
                            id="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            aria-invalid={!!state?.errors?.password}
                        />
                        {state?.errors?.password && (
                            <p className="text-sm text-destructive">
                                {state.errors.password[0]}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isPending}
                    >
                        {isPending ? "Logowanie..." : "Zaloguj się"}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                            Lub kontynuuj z
                        </span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Google
                </Button>
            </CardContent>
            <CardFooter className="flex-col space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                    Nie masz konta?{" "}
                    <Link 
                        href="/register" 
                        className="font-medium text-primary hover:underline"
                    >
                        Zarejestruj się
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}

