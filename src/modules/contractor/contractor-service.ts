import { db } from "@/db";
import { contractors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Contractor, ContractorInsert } from "@/types/database-types";

/**
 * Error class for contractor-related operations
 */
export class ContractorServiceError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string
  ) {
    super(message);
    this.name = "ContractorServiceError";
  }
}

/**
 * DTO for creating a contractor
 */
export interface CreateContractorDto {
  companyId: number;
  name: string;
  nip?: string;
  email?: string;
  isVatPayer: boolean;
  addressData: {
    street: string;
    buildingNumber: string;
    flatNumber?: string;
    city: string;
    postalCode: string;
    countryCode: string;
  };
}

/**
 * DTO for updating a contractor
 */
export interface UpdateContractorDto {
  name?: string;
  nip?: string;
  email?: string;
  isVatPayer?: boolean;
  addressData?: {
    street: string;
    buildingNumber: string;
    flatNumber?: string;
    city: string;
    postalCode: string;
    countryCode: string;
  };
}

/**
 * Service handling contractor-related business logic
 */
export class ContractorService {
  /**
   * Creates a new contractor for a company
   * 
   * @param data - Contractor data
   * @returns Created contractor
   */
  async create(data: CreateContractorDto): Promise<Contractor> {
    try {
      const [contractor] = await db
        .insert(contractors)
        .values({
          companyId: data.companyId,
          name: data.name,
          nip: data.nip || null,
          email: data.email || null,
          isVatPayer: data.isVatPayer,
          addressData: data.addressData,
        })
        .returning();

      if (!contractor) {
        throw new Error("Failed to create contractor");
      }

      return contractor;
    } catch (error) {
      console.error("Error creating contractor:", error);
      throw new ContractorServiceError(
        "Failed to create contractor",
        "Nie udało się utworzyć kontrahenta. Spróbuj ponownie."
      );
    }
  }

  /**
   * Finds all contractors for a company
   * 
   * @param companyId - Company ID
   * @returns Array of contractors
   */
  async findByCompanyId(companyId: number): Promise<Contractor[]> {
    try {
      return await db
        .select()
        .from(contractors)
        .where(eq(contractors.companyId, companyId))
        .orderBy(contractors.name);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      throw new ContractorServiceError(
        "Failed to fetch contractors",
        "Nie udało się pobrać listy kontrahentów."
      );
    }
  }

  /**
   * Finds a contractor by ID (with company verification)
   * 
   * @param contractorId - Contractor ID
   * @param companyId - Company ID for verification
   * @returns Contractor or null if not found
   */
  async findById(
    contractorId: number,
    companyId: number
  ): Promise<Contractor | null> {
    try {
      const [contractor] = await db
        .select()
        .from(contractors)
        .where(
          and(
            eq(contractors.id, contractorId),
            eq(contractors.companyId, companyId)
          )
        );

      return contractor || null;
    } catch (error) {
      console.error("Error fetching contractor:", error);
      throw new ContractorServiceError(
        "Failed to fetch contractor",
        "Nie udało się pobrać danych kontrahenta."
      );
    }
  }

  /**
   * Updates a contractor
   * 
   * @param contractorId - Contractor ID
   * @param companyId - Company ID for verification
   * @param data - Update data
   * @returns Updated contractor
   */
  async update(
    contractorId: number,
    companyId: number,
    data: UpdateContractorDto
  ): Promise<Contractor> {
    try {
      // First verify the contractor belongs to the company
      const existing = await this.findById(contractorId, companyId);
      if (!existing) {
        throw new ContractorServiceError(
          "Contractor not found",
          "Kontrahent nie został znaleziony."
        );
      }

      const [updated] = await db
        .update(contractors)
        .set({
          ...(data.name && { name: data.name }),
          ...(data.nip !== undefined && { nip: data.nip || null }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.isVatPayer !== undefined && { isVatPayer: data.isVatPayer }),
          ...(data.addressData && { addressData: data.addressData }),
        })
        .where(eq(contractors.id, contractorId))
        .returning();

      if (!updated) {
        throw new Error("Failed to update contractor");
      }

      return updated;
    } catch (error) {
      if (error instanceof ContractorServiceError) {
        throw error;
      }
      console.error("Error updating contractor:", error);
      throw new ContractorServiceError(
        "Failed to update contractor",
        "Nie udało się zaktualizować kontrahenta."
      );
    }
  }

  /**
   * Deletes a contractor
   * 
   * @param contractorId - Contractor ID
   * @param companyId - Company ID for verification
   */
  async delete(contractorId: number, companyId: number): Promise<void> {
    try {
      // First verify the contractor belongs to the company
      const existing = await this.findById(contractorId, companyId);
      if (!existing) {
        throw new ContractorServiceError(
          "Contractor not found",
          "Kontrahent nie został znaleziony."
        );
      }

      await db
        .delete(contractors)
        .where(eq(contractors.id, contractorId));
    } catch (error) {
      if (error instanceof ContractorServiceError) {
        throw error;
      }
      console.error("Error deleting contractor:", error);
      throw new ContractorServiceError(
        "Failed to delete contractor",
        "Nie udało się usunąć kontrahenta."
      );
    }
  }
}








