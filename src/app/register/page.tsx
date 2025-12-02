import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { RegisterForm } from "./RegisterForm"

export const metadata = {
    title: "Rejestracja | Invoice Manager",
    description: "Utwórz nowe konto",
}

export default async function RegisterPage() {
    // Redirect if already authenticated
    const session = await auth()
    if (session?.user) {
        redirect("/onboarding")
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-muted/30">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Stwórz konto
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Rozpocznij zarządzanie fakturami już dziś
                    </p>
                </div>

                <RegisterForm />
            </div>
        </div>
    )
}

