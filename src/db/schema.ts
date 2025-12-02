import {
    pgTable,
    serial,
    text,
    timestamp,
    decimal,
    boolean,
    primaryKey,
    integer,
    jsonb,
    index,
    unique
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// =========================================================
// SECTION 1: AUTHENTICATION (NextAuth)
// Standard NextAuth schema with UUIDs for users
// =========================================================

export const users = pgTable("user", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    password: text("password"), // For Credentials provider
});

export const accounts = pgTable(
    "account",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccount["type"]>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => [
        primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    ]
);

export const sessions = pgTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (verificationToken) => [
        primaryKey({
            columns: [verificationToken.identifier, verificationToken.token],
        }),
    ]
);

// =========================================================
// SECTION 2: BUSINESS LOGIC - ENTITIES
// =========================================================

/**
 * COMPANIES (The Issuer/Seller)
 * Represents the legal entity issuing the invoice. 
 * A user can manage multiple companies (e.g., an accountant).
 */
export const companies = pgTable('companies', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    nip: text('nip').notNull(), // Tax Identification Number (Crucial for KSeF)

    // Structured address is preferred for XML generation, but using JSONB for flexibility
    // Expected keys: street, buildingNumber, city, postalCode, countryCode
    addressData: jsonb('address_data').$type<{
        street: string;
        buildingNumber: string;
        flatNumber?: string;
        city: string;
        postalCode: string;
        countryCode: string;
    }>().notNull(),

    bankAccount: text('bank_account'),
    bankName: text('bank_name'),

    // Production or Demo environment token for KSeF
    ksefAuthToken: text('ksef_auth_token'),

    createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
    // Ensure one NIP isn't added twice by the same user to avoid duplicates
    unique().on(t.userId, t.nip)
]);

/**
 * CONTRACTORS (The Buyer)
 * Clients of the Company.
 */
export const contractors = pgTable('contractors', {
    id: serial('id').primaryKey(),
    // Linked to Company, not User directly. If Company is deleted, contractors go with it.
    companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    nip: text('nip'), // Nullable for B2C (consumers)

    // Using simple text for address here, but structured is better if you validate it
    addressData: jsonb('address_data').$type<{
        street: string;
        buildingNumber: string;
        flatNumber?: string;
        city: string;
        postalCode: string;
        countryCode: string;
    }>().notNull(),
    email: text('email'),

    isVatPayer: boolean('is_vat_payer').default(true),

    createdAt: timestamp('created_at').defaultNow(),
});

// =========================================================
// SECTION 3: INVOICING & KSEF
// =========================================================

/**
 * INVOICES (Header)
 * Contains all data required for FA(2) structure.
 */
export const invoices = pgTable('invoices', {
    id: serial('id').primaryKey(),

    // RESTRICT: Cannot delete a company if it has existing invoices (Audit trail protection)
    companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'restrict' }),

    // --- RELATIONSHIP & SNAPSHOTS ---
    // If contractor is deleted, set ID to null, but KEEP the snapshot data.
    contractorId: integer('contractor_id').references(() => contractors.id, { onDelete: 'set null' }),

    // ! CRITICAL: Snapshot of buyer data at the moment of issuance.
    // If the contractor changes address later, this invoice must NOT change.
    buyerNameSnapshot: text('buyer_name_snapshot').notNull(),
    buyerNipSnapshot: text('buyer_nip_snapshot'),
    buyerAddressSnapshot: text('buyer_address_snapshot').notNull(),

    // --- INVOICE DETAILS ---
    number: text('number').notNull(), // e.g., "FV/1/2024"
    type: text('type', { enum: ['VAT', 'CORRECTION', 'ADVANCE'] }).default('VAT').notNull(),

    issueDate: timestamp('issue_date', { mode: 'date' }).notNull(),
    saleDate: timestamp('sale_date', { mode: 'date' }).notNull(),
    paymentDeadline: timestamp('payment_deadline', { mode: 'date' }),

    paymentMethod: text('payment_method').default('transfer'), // transfer, cash, card
    splitPayment: boolean('split_payment').default(false), // MPP (Mechanizm Podzielonej Płatności)

    // --- FINANCIALS ---
    currency: text('currency').default('PLN').notNull(),
    exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).default('1.0000'),

    // Totals (Decimal returns string in JS, handle with Big.js or Decimal.js)
    totalNet: decimal('total_net', { precision: 12, scale: 2 }).notNull(),
    totalVat: decimal('total_vat', { precision: 12, scale: 2 }).notNull(),
    totalGross: decimal('total_gross', { precision: 12, scale: 2 }).notNull(),

    // --- KSEF LIFECYCLE ---
    // DRAFT: Working locally
    // QUEUED: Sent to your backend queue
    // PROCESSING: Sent to KSeF, waiting for UPO
    // VALID: Accepted by KSeF (Final state)
    // REJECTED: KSeF returned errors
    ksefStatus: text('ksef_status', {
        enum: ['DRAFT', 'QUEUED', 'PROCESSING', 'VALID', 'REJECTED']
    }).default('DRAFT').notNull(),

    ksefNumber: text('ksef_number'), // The 35-char ID assigned by KSeF
    ksefReferenceNumber: text('ksef_reference_number'), // Internal ref for API calls
    ksefSessionId: text('ksef_session_id'), // Session ID during upload

    // UPO (Urzędowe Poświadczenie Odbioru) - usually XML, store raw or link
    ksefUpoRaw: text('ksef_upo_raw'),

    // Validation errors from KSeF
    ksefErrors: jsonb('ksef_errors').$type<string[]>(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    // Enforce unique invoice number PER COMPANY (not globally)
    unique().on(t.companyId, t.number),
    // Performance indexes
    index('idx_invoice_issue_date').on(t.issueDate),
    index('idx_invoice_ksef_status').on(t.ksefStatus),
    index('idx_invoice_company').on(t.companyId),
]);

/**
 * INVOICE ITEMS
 * Line items for the invoice.
 */
export const invoiceItems = pgTable('invoice_items', {
    id: serial('id').primaryKey(),
    // CASCADE: If invoice is deleted (only possible if Draft), items go too.
    invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(), // Scale 3 for specific units
    unit: text('unit').default('szt').notNull(),

    netPrice: decimal('net_price', { precision: 12, scale: 2 }).notNull(),

    // VAT Rate: '23', '8', '5', '0', 'zw' (exempt), 'np' (not subject)
    vatRate: text('vat_rate').notNull(),

    // Calculated values (Persisted to ensure consistency with XML sent to KSeF)
    netValue: decimal('net_value', { precision: 12, scale: 2 }).notNull(),
    vatValue: decimal('vat_value', { precision: 12, scale: 2 }).notNull(),
    grossValue: decimal('gross_value', { precision: 12, scale: 2 }).notNull(),

    // GTU Codes (01-13) - Optional per item
    gtuCode: text('gtu_code'),
});

// =========================================================
// SECTION 4: RELATIONS
// =========================================================

export const usersRelations = relations(users, ({ many }) => ({
    accounts: many(accounts),
    companies: many(companies), // User has many companies
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
    user: one(users, { fields: [companies.userId], references: [users.id] }),
    invoices: many(invoices),
    contractors: many(contractors),
}));

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
    company: one(companies, { fields: [contractors.companyId], references: [companies.id] }),
    invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    company: one(companies, { fields: [invoices.companyId], references: [companies.id] }),
    contractor: one(contractors, { fields: [invoices.contractorId], references: [contractors.id] }),
    items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
    invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));