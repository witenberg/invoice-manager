'use server'

import { auth } from "@/auth"
import { CompanyService } from "@/modules/company/company-service"
import { z } from "zod"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { OnboardingActionState } from "@/types/action-types"
import { getSafeErrorMessage, SafeError } from "@/types/error-types"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import {
  isValidNip,
  isValidPostalCode,
  isValidBuildingNumber,
  isValidCityName,
  isValidKsefToken,
} from "@/lib/validation-helpers"

/**
 * Validation schema for company onboarding form
 * Uses custom validators for Polish-specific formats
 */
const onboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa firmy jest wymagana")
    .min(2, "Nazwa firmy musi mieć co najmniej 2 znaki")
    .max(200, "Nazwa firmy jest za długa"),
  
  nip: z
    .string()
    .min(1, "NIP jest wymagany")
    .length(10, "NIP musi mieć dokładnie 10 cyfr")
    .regex(/^\d+$/, "NIP może zawierać tylko cyfry")
    .refine(isValidNip, "NIP jest nieprawidłowy"),
  
  street: z
    .string()
    .min(1, "Ulica jest wymagana")
    .min(2, "Nazwa ulicy musi mieć co najmniej 2 znaki")
    .max(100, "Nazwa ulicy jest za długa"),
  
  buildingNumber: z
    .string()
    .min(1, "Numer budynku jest wymagany")
    .refine(
      isValidBuildingNumber,
      "Nieprawidłowy format numeru"
    ),
  
  city: z
    .string()
    .min(1, "Miejscowość jest wymagana")
    .min(2, "Nazwa miejscowości musi mieć co najmniej 2 znaki")
    .max(100, "Nazwa miejscowości jest za długa")
    .refine(isValidCityName, "Miejscowość nie może zawierać cyfr"),
  
  postalCode: z
    .string()
    .min(1, "Kod pocztowy jest wymagany")
    .refine(
      isValidPostalCode,
      "Nieprawidłowy format kodu pocztowego."
    ),
  
  ksefToken: z
    .string()
    .min(1, "Token KSeF jest wymagany")
    .refine(
      isValidKsefToken,
      "Token KSeF jest nieprawidłowy (powinien mieć minimum 30 znaków)"
    ),
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
        message: "Wystąpił błąd podczas rejestrowania nowej firmy.",
        errors: validated.error.flatten().fieldErrors
      }
    }

    // STEP 1: Validate KSeF token BEFORE creating company
    // This prevents creating a company with invalid credentials
    const service = new CompanyService()
    
    try {
      await service.validateKsefToken(
        validated.data.nip,
        validated.data.ksefToken
      );
    } catch (ksefError) {
      // If KSeF validation fails, return error to user
      return {
        success: false,
        message: getSafeErrorMessage(ksefError),
      };
    }

    // STEP 2: Create company (only if KSeF token is valid)
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

    // STEP 3: Establish full KSeF session and save session token
    // This should succeed since we already validated the token
    try {
      await service.testConnection(session.user.id, newCompany.id);
    } catch (ksefError) {
      // Log warning but don't block user (company was already created)
      if (process.env.NODE_ENV === "development") {
        console.warn("KSeF session warning:", getSafeErrorMessage(ksefError));
      }
    }

    // STEP 4: Redirect to dashboard
    redirect(`/dashboard/companies/${newCompany.id}`);
  } catch (error) {
    // Allow Next.js redirects to pass through
    if (isRedirectError(error)) {
      throw error;
    }

    // Return safe error message to user
    return {
      success: false,
      message: getSafeErrorMessage(error),
    };
  }
}