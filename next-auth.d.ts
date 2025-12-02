import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

// Definiujemy strukturę pojedynczego dostępu do firmy
export interface UserCompanyAccess {
  companyId: number
  role: "OWNER" | "ACCOUNTANT" | "EMPLOYEE" // Zgodne z Twoim enumem w bazie
}

declare module "next-auth" {
  /**
   * Rozszerzamy sesję o ID oraz listę firm użytkownika
   */
  interface Session {
    user: {
      id: string
      // Tablica firm, do których user ma dostęp.
      // Cache'ujemy to w sesji, żeby nie pytać bazy w każdym komponencie.
      companies: UserCompanyAccess[] 
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  /**
   * Rozszerzamy JWT token o user ID
   */
  interface JWT {
    id: string
  }
}