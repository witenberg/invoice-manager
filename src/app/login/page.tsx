import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./LoginForm"

export const metadata = {
    title: "Logowanie | Invoice Manager",
    description: "Zaloguj się do swojego konta",
}

interface LoginPageProps {
    searchParams: Promise<{
        callbackUrl?: string
        registered?: string
    }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    // Redirect if already authenticated
    const session = await auth()
    if (session?.user) {
        redirect("/onboarding")
    }

    const params = await searchParams
    const showRegisteredMessage = params.registered === "true"

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-muted/30">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Witaj ponownie
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Zaloguj się do swojego konta
                    </p>
                </div>

                <LoginForm 
                    showRegisteredMessage={showRegisteredMessage}
                    callbackUrl={params.callbackUrl}
                />
            </div>
        </div>
    )
}
