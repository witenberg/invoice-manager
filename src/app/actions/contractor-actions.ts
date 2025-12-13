"use server";

import { z } from "zod";
import { ContractorService, ContractorServiceError } from "@/modules/contractor/contractor-service";
import { requireAuth } from "@/lib/route-guards";
import { revalidatePath } from "next/cache";
import { CompanyService } from "@/modules/company/company-service";

/**
 * Validation schema for contractor form
 */
const contractorSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć co najmniej 2 znaki"),
  nip: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{10}$/.test(val),
      "NIP musi składać się z 10 cyfr"
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      "Nieprawidłowy format adresu email"
    ),
  isVatPayer: z.boolean().default(true),
  street: z.string().min(1, "Ulica jest wymagana"),
  buildingNumber: z.string().min(1, "Numer budynku jest wymagany"),
  flatNumber: z.string().optional(),
  city: z.string().min(1, "Miasto jest wymagane"),
  postalCode: z
    .string()
    .regex(/^[0-9]{2}-[0-9]{3}$/, "Kod pocztowy musi być w formacie XX-XXX"),
  countryCode: z.string().default("PL"),
});

/**
 * Server Action State for Contractor Operations
 */
export type ContractorActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  contractorId?: number;
} | null;

/**
 * Creates a new contractor
 * 
 * @param companyId - ID of the company
 * @param prevState - Previous action state (from useActionState)
 * @param formData - Form data from client
 * @returns Action state with success/error information
 */
export async function createContractorAction(
  companyId: number,
  prevState: ContractorActionState,
  formData: FormData
): Promise<ContractorActionState> {
  try {
    // Require authentication
    const session = await requireAuth();

    // Verify user has access to the company
    const companyService = new CompanyService();
    try {
      await companyService.findById(session.user.id, companyId);
    } catch {
      return {
        success: false,
        message: "Nie masz dostępu do tej firmy.",
      };
    }

    // Parse form data
    const rawData = {
      name: formData.get("name"),
      nip: formData.get("nip") || undefined,
      email: formData.get("email") || undefined,
      isVatPayer: formData.get("isVatPayer") === "true",
      street: formData.get("street"),
      buildingNumber: formData.get("buildingNumber"),
      flatNumber: formData.get("flatNumber") || undefined,
      city: formData.get("city"),
      postalCode: formData.get("postalCode"),
      countryCode: formData.get("countryCode") || "PL",
    };

    // Validate with Zod schema
    const validationResult = contractorSchema.safeParse(rawData);

    if (!validationResult.success) {
      return {
        success: false,
        message: "Formularz zawiera błędy. Sprawdź wprowadzone dane.",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // Create contractor
    const contractorService = new ContractorService();
    const contractor = await contractorService.create({
      companyId,
      name: validationResult.data.name,
      nip: validationResult.data.nip,
      email: validationResult.data.email,
      isVatPayer: validationResult.data.isVatPayer,
      addressData: {
        street: validationResult.data.street,
        buildingNumber: validationResult.data.buildingNumber,
        flatNumber: validationResult.data.flatNumber,
        city: validationResult.data.city,
        postalCode: validationResult.data.postalCode,
        countryCode: validationResult.data.countryCode,
      },
    });

    // Revalidate company page
    revalidatePath(`/dashboard/companies/${companyId}`);

    return {
      success: true,
      message: "Kontrahent został dodany pomyślnie.",
      contractorId: contractor.id,
    };
  } catch (error) {
    console.error("Contractor creation error:", error);

    // Handle known service errors
    if (error instanceof ContractorServiceError) {
      return {
        success: false,
        message: error.userMessage,
      };
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Błąd walidacji danych.",
        errors: error.flatten().fieldErrors,
      };
    }

    // Generic error
    return {
      success: false,
      message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
    };
  }
}

/**
 * Fetches contractors for a company (for dropdown)
 * 
 * @param companyId - ID of the company
 * @returns Array of contractors
 */
export async function fetchContractorsAction(companyId: number) {
  try {
    const session = await requireAuth();
    
    // Verify user has access to the company
    const companyService = new CompanyService();
    await companyService.findById(session.user.id, companyId);

    // Fetch contractors
    const contractorService = new ContractorService();
    return await contractorService.findByCompanyId(companyId);
  } catch (error) {
    console.error("Error fetching contractors:", error);
    return [];
  }
}

/**
 * Deletes a contractor
 * 
 * @param companyId - ID of the company
 * @param contractorId - ID of the contractor to delete
 * @returns Action state with success/error information
 */
export async function deleteContractorAction(
  companyId: number,
  contractorId: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Require authentication
    const session = await requireAuth();

    // Verify user has access to the company
    const companyService = new CompanyService();
    try {
      await companyService.findById(session.user.id, companyId);
    } catch {
      return {
        success: false,
        message: "Nie masz dostępu do tej firmy.",
      };
    }

    // Delete contractor
    const contractorService = new ContractorService();
    await contractorService.delete(contractorId, companyId);

    // Revalidate company page
    revalidatePath(`/dashboard/companies/${companyId}`);

    return {
      success: true,
      message: "Kontrahent został usunięty.",
    };
  } catch (error) {
    console.error("Contractor deletion error:", error);

    // Handle known service errors
    if (error instanceof ContractorServiceError) {
      return {
        success: false,
        message: error.userMessage,
      };
    }

    // Generic error
    return {
      success: false,
      message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
    };
  }
}
