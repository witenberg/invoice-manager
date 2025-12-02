import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function HomePage() {
    const session = await auth()

    // Redirect authenticated users to onboarding
    if (session?.user) {
        redirect("/onboarding")
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">Invoice Manager</h2>
                    </div>
                    <nav className="flex gap-2">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Zaloguj się</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/register">Rozpocznij</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                <section className="container py-20 md:py-32">
                    <div className="mx-auto max-w-3xl text-center">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                            Zarządzaj fakturami
                            <span className="block text-primary mt-2">z integracją KSeF</span>
                        </h1>
                        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Profesjonalny system do wystawiania i zarządzania fakturami
                            z pełną integracją z Krajowym Systemem e-Faktur.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" asChild>
                                <Link href="/register">
                                    Rozpocznij za darmo
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/login">
                                    Mam już konto
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="border-t bg-muted/30 py-20">
                    <div className="container">
                        <div className="mx-auto max-w-5xl">
                            <h2 className="text-3xl font-bold text-center mb-12">
                                Kluczowe funkcje
                            </h2>
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        Wystawianie faktur
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Twórz faktury VAT zgodne z polskimi przepisami
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        Integracja KSeF
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Automatyczne przesyłanie do Krajowego Systemu e-Faktur
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        Zarządzanie zespołem
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Współdziel dostęp z księgowymi i pracownikami
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t py-6">
                <div className="container text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Invoice Manager. Wszystkie prawa zastrzeżone.</p>
                </div>
            </footer>
        </div>
    )
}
