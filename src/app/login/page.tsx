import { requireGuest } from "@/lib/route-guards";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Logowanie | Invoice Manager",
  description: "Zaloguj się do swojego konta",
};

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    registered?: string;
  }>;
}

/**
 * Login Page
 * Uses route guard to prevent logged-in users from accessing
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Redirect if already authenticated
  await requireGuest();

  const params = await searchParams;
  const showRegisteredMessage = params.registered === "true";

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
  );
}
