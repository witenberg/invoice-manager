import { z } from "zod";

/**
 * Invoice Form Schema
 * Validates invoice data according to FA(3) KSeF requirements
 * 
 * Architecture:
 * - Uses discriminated union for invoice types (VAT, CORRECTION, ADVANCE)
 * - Each type has its own specific fields
 * - Shared fields are in base schema
 */

// =========================================================
// VALIDATION HELPERS
// =========================================================

const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: "Nieprawidłowa data" }
);

const optionalDateStringSchema = z.union([
  dateStringSchema,
  z.literal(""),
]).optional();

const nipSchema = z.union([
  z.string().regex(/^\d{10}$/, "NIP musi składać się z 10 cyfr"),
  z.literal(""),
]).optional();

const postalCodeSchema = z.string().regex(
  /^\d{2}-\d{3}$/,
  "Kod pocztowy w formacie XX-XXX"
);

// =========================================================
// ADDRESS SCHEMA
// =========================================================

export const addressSchema = z.object({
  street: z.string().min(1, "Ulica jest wymagana").max(255),
  buildingNumber: z.string().min(1, "Numer budynku jest wymagany").max(20),
  flatNumber: z.union([z.string().max(20), z.literal("")]).optional(),
  city: z.string().min(1, "Miasto jest wymagane").max(100),
  postalCode: postalCodeSchema,
  countryCode: z.string().length(2, "Kod kraju (2 litery)"),
});

export type AddressFormData = z.infer<typeof addressSchema>;

// =========================================================
// BUYER / RECIPIENT SCHEMA
// =========================================================

export const buyerSchema = z.object({
  name: z.string().min(1, "Nazwa nabywcy jest wymagana").max(255),
  nip: nipSchema,
  address: addressSchema,
});

export type BuyerFormData = z.infer<typeof buyerSchema>;

// Optional recipient (when different from buyer)
export const recipientSchema = buyerSchema.optional();

export type RecipientFormData = z.infer<typeof recipientSchema>;

// =========================================================
// INVOICE ITEM SCHEMA
// =========================================================

export const invoiceItemSchema = z.object({
  name: z.string().min(1, "Nazwa pozycji jest wymagana").max(255),
  quantity: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Ilość musi być większa od 0" }
  ),
  unit: z.string().min(1, "Jednostka jest wymagana"),
  netPrice: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Cena netto musi być liczbą >= 0" }
  ),
  vatRate: z.enum(["23", "8", "5", "0", "zw", "np", "oo"], {
    message: "Stawka VAT jest wymagana",
  }),
  // Advanced fields (hidden by default in UI)
  gtuCode: z.union([z.string(), z.literal("")]).optional(),
  pkwiu: z.union([z.string(), z.literal("")]).optional(),
  cn: z.union([z.string(), z.literal("")]).optional(),
});

export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;

// For CORRECTION invoices - item with "before" and "after" states
export const correctionItemSchema = z.object({
  name: z.string().min(1, "Nazwa pozycji jest wymagana").max(255),
  // Before correction
  quantityBefore: z.string(),
  netPriceBefore: z.string(),
  vatRateBefore: z.string(),
  // After correction
  quantityAfter: z.string(),
  netPriceAfter: z.string(),
  vatRateAfter: z.string(),
  unit: z.string(),
  gtuCode: z.union([z.string(), z.literal("")]).optional(),
});

export type CorrectionItemFormData = z.infer<typeof correctionItemSchema>;

// =========================================================
// BASE INVOICE SCHEMA (COMMON FIELDS)
// =========================================================

const baseInvoiceSchema = z.object({
  // Metadata
  number: z.string().min(1, "Numer faktury jest wymagany").max(50),
  issueDate: dateStringSchema,
  saleDate: dateStringSchema,
  
  // Buyer
  buyer: buyerSchema,
  
  // Optional recipient (different delivery address)
  hasRecipient: z.boolean(),
  recipient: recipientSchema,
  
  // Payment
  paymentMethod: z.enum(["transfer", "cash", "card"], {
    message: "Forma płatności jest wymagana",
  }),
  paymentDeadline: optionalDateStringSchema,
  bankAccount: z.union([z.string(), z.literal("")]).optional(),
  
  // Currency
  currency: z.string().length(3, "Kod waluty (3 litery)"),
  exchangeRate: z.string().optional(),
  
  // Flags
  splitPayment: z.boolean(), // MPP
  reverseCharge: z.boolean(), // Odwrotne obciążenie
  cashMethod: z.boolean(), // Metoda kasowa
  selfBilling: z.boolean(), // Samofakturowanie
  
  // KSeF
  sendToKsef: z.boolean(),
  
  // Notes
  notes: z.union([z.string(), z.literal("")]).optional(),
}).refine(
  (data) => {
    // If hasRecipient is false, recipient can be undefined
    if (!data.hasRecipient) {
      return true;
    }
    // If hasRecipient is true, recipient must be defined and valid
    return data.recipient !== undefined;
  },
  {
    message: "Dane odbiorcy są wymagane gdy zaznaczono 'Odbiorca jest inny niż nabywca'",
    path: ["recipient"],
  }
).superRefine((data, ctx) => {
  // If hasRecipient is true, validate recipient fields
  if (data.hasRecipient && data.recipient) {
    if (!data.recipient.name || data.recipient.name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nazwa odbiorcy jest wymagana",
        path: ["recipient", "name"],
      });
    }
    if (!data.recipient.address.street || data.recipient.address.street.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ulica odbiorcy jest wymagana",
        path: ["recipient", "address", "street"],
      });
    }
    if (!data.recipient.address.buildingNumber || data.recipient.address.buildingNumber.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Numer budynku odbiorcy jest wymagany",
        path: ["recipient", "address", "buildingNumber"],
      });
    }
    if (!data.recipient.address.city || data.recipient.address.city.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Miasto odbiorcy jest wymagane",
        path: ["recipient", "address", "city"],
      });
    }
    if (!data.recipient.address.postalCode || data.recipient.address.postalCode.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kod pocztowy odbiorcy jest wymagany",
        path: ["recipient", "address", "postalCode"],
      });
    }
    if (!data.recipient.address.countryCode || data.recipient.address.countryCode.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kod kraju odbiorcy jest wymagany",
        path: ["recipient", "address", "countryCode"],
      });
    }
  }
});

// =========================================================
// TYPE-SPECIFIC SCHEMAS (DISCRIMINATED UNION)
// =========================================================

// Standard VAT Invoice
const vatInvoiceSchema = baseInvoiceSchema.safeExtend({
  type: z.literal("VAT"),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Faktura musi zawierać co najmniej 1 pozycję"),
});

// Correction Invoice (Faktura Korygująca)
const correctionInvoiceSchema = baseInvoiceSchema.safeExtend({
  type: z.literal("CORRECTION"),
  items: z
    .array(correctionItemSchema)
    .min(1, "Faktura musi zawierać co najmniej 1 pozycję"),
  
  // Original invoice data
  originalInvoice: z.object({
    number: z.string().min(1, "Numer faktury korygowanej jest wymagany"),
    issueDate: dateStringSchema,
    ksefNumber: z.union([z.string(), z.literal("")]).optional(),
  }),
  
  // Correction reason
  correctionReason: z.string().min(1, "Przyczyna korekty jest wymagana").max(500),
});

// Advance Invoice (Faktura Zaliczkowa)
const advanceInvoiceSchema = baseInvoiceSchema.safeExtend({
  type: z.literal("ADVANCE"),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Faktura musi zawierać co najmniej 1 pozycję"),
  
  // Order details
  orderDetails: z.object({
    orderValue: z.string().refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Wartość zamówienia musi być większa od 0" }
    ),
    orderDate: dateStringSchema,
    orderNumber: z.string().optional(),
  }),
  
  // Advance percentage
  advancePercentage: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 100;
    },
    { message: "Procent zaliczki musi być między 0 a 100" }
  ),
});

// =========================================================
// MAIN FORM SCHEMA (DISCRIMINATED UNION)
// =========================================================

export const invoiceFormSchema = z.discriminatedUnion("type", [
  vatInvoiceSchema,
  correctionInvoiceSchema,
  advanceInvoiceSchema,
]);

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type VatInvoiceFormData = z.infer<typeof vatInvoiceSchema>;
export type CorrectionInvoiceFormData = z.infer<typeof correctionInvoiceSchema>;
export type AdvanceInvoiceFormData = z.infer<typeof advanceInvoiceSchema>;

// =========================================================
// CALCULATED TOTALS
// =========================================================

/**
 * Calculated invoice totals
 */
export interface InvoiceTotals {
  totalNet: string;
  totalVat: string;
  totalGross: string;
  vatBreakdown: Array<{
    vatRate: string;
    netValue: string;
    vatValue: string;
    grossValue: string;
  }>;
}

/**
 * Calculates invoice totals from items
 * Uses string arithmetic to avoid floating point errors
 */
export function calculateInvoiceTotals(
  items: InvoiceItemFormData[]
): InvoiceTotals {
  const vatBreakdownMap = new Map<
    string,
    { netValue: number; vatValue: number }
  >();

  let totalNet = 0;
  let totalVat = 0;

  for (const item of items) {
    const quantity = parseFloat(item.quantity);
    const netPrice = parseFloat(item.netPrice);
    const netValue = quantity * netPrice;

    let vatValue = 0;
    if (item.vatRate !== "zw" && item.vatRate !== "np" && item.vatRate !== "oo") {
      const vatRateNum = parseFloat(item.vatRate);
      vatValue = (netValue * vatRateNum) / 100;
    }

    totalNet += netValue;
    totalVat += vatValue;

    // Accumulate VAT breakdown
    const existing = vatBreakdownMap.get(item.vatRate) || {
      netValue: 0,
      vatValue: 0,
    };
    existing.netValue += netValue;
    existing.vatValue += vatValue;
    vatBreakdownMap.set(item.vatRate, existing);
  }

  const totalGross = totalNet + totalVat;

  // Convert to VAT breakdown array
  const vatBreakdown = Array.from(vatBreakdownMap.entries()).map(
    ([vatRate, values]) => ({
      vatRate,
      netValue: values.netValue.toFixed(2),
      vatValue: values.vatValue.toFixed(2),
      grossValue: (values.netValue + values.vatValue).toFixed(2),
    })
  );

  return {
    totalNet: totalNet.toFixed(2),
    totalVat: totalVat.toFixed(2),
    totalGross: totalGross.toFixed(2),
    vatBreakdown,
  };
}

// =========================================================
// DEFAULT VALUES (TEMPLATES)
// =========================================================

export function getDefaultInvoiceValues(
  type: "VAT" | "CORRECTION" | "ADVANCE"
): Partial<InvoiceFormData> {
  const today = new Date().toISOString().split("T")[0];
  
  const baseDefaults = {
    number: "",
    issueDate: today,
    saleDate: today,
    buyer: {
      name: "",
      nip: "",
      address: {
        street: "",
        buildingNumber: "",
        flatNumber: "",
        city: "",
        postalCode: "",
        countryCode: "PL",
      },
    },
    hasRecipient: false,
    paymentMethod: "transfer" as const,
    paymentDeadline: "",
    currency: "PLN",
    splitPayment: false,
    reverseCharge: false,
    cashMethod: false,
    selfBilling: false,
    sendToKsef: true,
    notes: "",
  };

  if (type === "VAT") {
    return {
      ...baseDefaults,
      type: "VAT",
      items: [
        {
          name: "",
          quantity: "1",
          unit: "szt",
          netPrice: "0",
          vatRate: "23",
          gtuCode: "",
          pkwiu: "",
          cn: "",
        },
      ],
    } as VatInvoiceFormData;
  }

  if (type === "CORRECTION") {
    return {
      ...baseDefaults,
      type: "CORRECTION",
      items: [
        {
          name: "",
          quantityBefore: "1",
          netPriceBefore: "0",
          vatRateBefore: "23",
          quantityAfter: "1",
          netPriceAfter: "0",
          vatRateAfter: "23",
          unit: "szt",
          gtuCode: "",
        },
      ],
      originalInvoice: {
        number: "",
        issueDate: "",
        ksefNumber: "",
      },
      correctionReason: "",
    } as CorrectionInvoiceFormData;
  }

  if (type === "ADVANCE") {
    return {
      ...baseDefaults,
      type: "ADVANCE",
      items: [
        {
          name: "",
          quantity: "1",
          unit: "szt",
          netPrice: "0",
          vatRate: "23",
          gtuCode: "",
          pkwiu: "",
          cn: "",
        },
      ],
      orderDetails: {
        orderValue: "0",
        orderDate: today,
        orderNumber: "",
      },
      advancePercentage: "100",
    } as AdvanceInvoiceFormData;
  }

  return baseDefaults;
}

