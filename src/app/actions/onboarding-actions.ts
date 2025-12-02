'use server'

import { auth } from "@/auth"
import { CompanyService } from "@/modules/company/company-service"
import { z } from "zod"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { OnboardingActionState } from "@/types/action-types"
import { getSafeErrorMessage, SafeError } from "@/types/error-types"
import { isRedirectError } from "next/dist/client/components/redirect-error"

/**
 * Validation schema for company onboarding form
 */
const onboardingSchema = z.object({
  name: z.string().min(2, "Nazwa jest wymagana"),
  nip: z.string().length(10, "NIP musi mieć 10 znaków"),
  street: z.string().min(1, "Ulica jest wymagana"),
  buildingNumber: z.string().min(1, "Numer budynku jest wymagany"),
  city: z.string().min(1, "Miejscowość jest wymagana"),
  postalCode: z.string().min(5, "Kod pocztowy jest wymagany"),
  ksefToken: z.string()
    .min(30, "Token KSeF musi mieć co najmniej 30 znaków")
    .max(2000, "Token jest za długi"),
})

/**
 * Creates a new company with KSeF integration
 * @param prevState - Previous action state (for useActionState)
 * @param formData - Form data from client
 */
export async function createCompanyAction(
  prevState: OnboardingActionState | null,
  formData: FormData
): Promise<OnboardingActionState> {
  try {
    // Force cookies to be read (Next.js 16 requirement)
    await cookies()
    
    const session = await auth()
    
    if (!session?.user?.id) {
      return { 
        success: false, 
        message: "Brak autoryzacji. Spróbuj się wylogować i zalogować ponownie." 
      }
    }

    // Parse and validate form data
    const rawData = Object.fromEntries(formData.entries())
    const validated = onboardingSchema.safeParse(rawData)

    if (!validated.success) {
      return {
        success: false,
        message: "Błędy w formularzu",
        errors: validated.error.flatten().fieldErrors
      }
    }

    // Create company
    const service = new CompanyService()
    const newCompany = await service.createCompanyWithKsef({
      userId: session.user.id,
      name: validated.data.name,
      nip: validated.data.nip,
      address: {
        street: validated.data.street,
        buildingNumber: validated.data.buildingNumber,
        city: validated.data.city,
        postalCode: validated.data.postalCode,
        countryCode: 'PL'
      },
      ksefToken: validated.data.ksefToken
    })

    // Try to establish KSeF session (non-blocking)
    // If this fails, company is still created successfully
    try {
      await service.testConnection(session.user.id, newCompany.id)
    } catch (ksefError) {
      // Log but don't block user
      console.error("KSeF connection warning:", getSafeErrorMessage(ksefError))
    }

    // Redirect to dashboard
    redirect(`/dashboard/companies/${newCompany.id}`)
    
  } catch (error) {
    // Allow Next.js redirects to pass through
    if (isRedirectError(error)) {
      throw error
    }

    // Return safe error message to user
    return { 
      success: false, 
      message: getSafeErrorMessage(error instanceof SafeError ? error : undefined) 
    }
  }
}