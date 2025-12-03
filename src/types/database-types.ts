/**
 * Database Type Helpers
 * Utility types for working with Drizzle ORM
 */

import type {
  companies,
  companyMembers,
  companyInvitations,
  users,
} from "@/db/schema";

/**
 * Inferred select types from schema
 */
export type Company = typeof companies.$inferSelect;
export type CompanyInsert = typeof companies.$inferInsert;

export type CompanyMember = typeof companyMembers.$inferSelect;
export type CompanyMemberInsert = typeof companyMembers.$inferInsert;

export type CompanyInvitation = typeof companyInvitations.$inferSelect;
export type CompanyInvitationInsert = typeof companyInvitations.$inferInsert;

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

/**
 * Company with member count (for listings)
 */
export type CompanyWithMetadata = Company & {
  memberCount?: number;
};

/**
 * User with company memberships
 */
export type UserWithCompanies = User & {
  companies: CompanyMember[];
};

