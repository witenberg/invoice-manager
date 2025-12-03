'use server'

/**
 * Authentication Actions
 * 
 * Server actions for login and registration
 * Following Next.js 16 + React 19 patterns with useActionState
 */

import { signIn } from "@/auth"
import { AuthService, AuthError } from "@/modules/auth/auth-service"
import { z } from "zod"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Validation schema for login form
 */
const loginSchema = z.object({
    email: z.string().email("Nieprawidłowy format adresu email"),
    password: z.string().min(1, "Hasło jest wymagane"),
})

/**
 * Validation schema for registration form
 */
const registerSchema = z.object({
    name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki").optional(),
    email: z.string().email("Nieprawidłowy format adresu email"),
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
})

/**
 * Action state types for authentication forms
 */
export type LoginState = {
    success?: boolean
    message?: string
    errors?: Record<string, string[]>
}

export type RegisterState = {
    success?: boolean
    message?: string
    errors?: Record<string, string[]>
}

/**
 * Authenticates user with credentials using NextAuth
 * 
 * @param prevState - Previous state from useActionState
 * @param formData - Form data containing email and password
 */
export async function loginAction(
    prevState: LoginState | null,
    formData: FormData
): Promise<LoginState> {
    try {
        // Parse and validate form data
        const rawData = {
            email: formData.get("email"),
            password: formData.get("password"),
        }

        const validated = loginSchema.safeParse(rawData)

        if (!validated.success) {
            return {
                success: false,
                message: "Błędy w formularzu",
                errors: validated.error.flatten().fieldErrors,
            }
        }

        // Attempt sign in with NextAuth
        await signIn("credentials", {
            email: validated.data.email,
            password: validated.data.password,
            redirectTo: "/onboarding",
        })

        // Revalidate to clear Next.js cache
        revalidatePath('/onboarding')

        return {
            success: true,
            message: "Pomyślnie zalogowano",
        }
    } catch (error) {
        // NextAuth throws redirect errors for successful login
        if (isRedirectError(error)) {
            throw error
        }

        console.error("Login error:", error)

        return {
            success: false,
            message: error instanceof AuthError 
                ? error.message 
                : "Nieprawidłowy email lub hasło",
        }
    }
}

/**
 * Creates new user account and redirects to login
 * 
 * @param prevState - Previous state from useActionState
 * @param formData - Form data containing name, email, password, confirmPassword
 */
export async function registerAction(
    prevState: RegisterState | null,
    formData: FormData
): Promise<RegisterState> {
    try {
        // Parse and validate form data
        const rawData = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            confirmPassword: formData.get("confirmPassword"),
        }

        const validated = registerSchema.safeParse(rawData)

        if (!validated.success) {
            return {
                success: false,
                message: "Wystąpił błąd podczas rejestracji",
                errors: validated.error.flatten().fieldErrors,
            }
        }

        // Create user account
        const authService = new AuthService()
        await authService.register({
            email: validated.data.email,
            password: validated.data.password,
            name: validated.data.name || undefined,
        })

        // Redirect to login page with success message
        // This avoids session cache issues with immediate auto-login
        redirect("/login?registered=true")
    } catch (error) {
        // NextAuth throws NEXT_REDIRECT error for successful login
        // We need to let it through
        if (isRedirectError(error)) {
            throw error
        }

        console.error("Registration error:", error)

        if (error instanceof AuthError) {
            return {
                success: false,
                message: error.message,
            }
        }

        return {
            success: false,
            message: "Nie udało się utworzyć konta. Spróbuj ponownie.",
        }
    }
}

/**
 * Logs out the current user and redirects to login page
 */
export async function signOutAction(): Promise<void> {
    try {
        const { signOut } = await import("@/auth")
        await signOut({ redirectTo: "/login" })
    } catch (error) {
        if (isRedirectError(error)) {
            throw error
        }
        throw error
    }
}

