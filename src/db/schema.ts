import { pgTable, serial, text, timestamp, decimal, boolean, primaryKey, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// =========================================================
// SEKCJA 1: NEXT-AUTH (Uwierzytelnianie)
// =========================================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()), // Generujemy ID jako UUID (standard NextAuth)
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Pole 'password' dodane ręcznie dla logowania Credentials. 
  // Dla userów z Google będzie null.
  password: text("password"), 
});

// Tabela łącząca usera z dostawcami (np. Google)
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
// SEKCJA 2: LOGIKA BIZNESOWA (Faktury)
// =========================================================

// --- FIRMY / KONTRAHENCI ---
export const contractors = pgTable('contractors', {
  id: serial('id').primaryKey(),
  // WAŻNE: Kontrahent należy do konkretnego usera
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  nip: text('nip').notNull(), 
  address: text('address'), 
  email: text('email'), 
  createdAt: timestamp('created_at').defaultNow(),
});

// --- FAKTURY (Nagłówek) ---
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  // WAŻNE: Faktura należy do konkretnego usera
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  number: text('number').notNull(), 
  contractorId: integer('contractor_id').references(() => contractors.id), // Zmieniłem serial na integer (klucz obcy)
  
  issueDate: timestamp('issue_date').notNull(),
  saleDate: timestamp('sale_date').notNull(),
  paymentMethod: text('payment_method').default('transfer'),
  paymentDeadline: timestamp('payment_deadline'), 
  
  totalNet: decimal('total_net', { precision: 12, scale: 2 }).notNull(),
  totalVat: decimal('total_vat', { precision: 12, scale: 2 }).notNull(),
  totalGross: decimal('total_gross', { precision: 12, scale: 2 }).notNull(),
  
  // --- KSEF ---
  ksefStatus: text('ksef_status').default('DRAFT').notNull(), 
  ksefNumber: text('ksef_number'), 
  ksefReferenceNumber: text('ksef_reference_number'),
  ksefUpo: text('ksef_upo'),
  ksefErrorMessage: text('ksef_error_message'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// --- POZYCJE FAKTURY ---
export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }), // Zmieniłem serial na integer + cascade
  
  name: text('name').notNull(), 
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').default('szt'), 
  
  netPrice: decimal('net_price', { precision: 12, scale: 2 }).notNull(),
  vatRate: text('vat_rate').notNull(), 
  
  netValue: decimal('net_value', { precision: 12, scale: 2 }).notNull(),
  grossValue: decimal('gross_value', { precision: 12, scale: 2 }).notNull(),
});

// =========================================================
// SEKCJA 3: RELACJE (Drizzle Relations)
// =========================================================

// Relacje Użytkownika
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  invoices: many(invoices),
  contractors: many(contractors),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// Relacje Biznesowe
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  contractor: one(contractors, {
    fields: [invoices.contractorId],
    references: [contractors.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
  user: one(users, {
    fields: [contractors.userId],
    references: [users.id],
  }),
  invoices: many(invoices),
}));