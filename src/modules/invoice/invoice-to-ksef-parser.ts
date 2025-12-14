/**
 * Invoice to KSeF Parser
 * Converts InvoiceFormData (from form) to KsefFakturaInput (for XML generation)
 */

import type { InvoiceFormData, InvoiceItemFormData, CorrectionItemFormData } from "./invoice-schema";
import type { KsefFakturaInput, Adres, Podmiot1, Podmiot2, Podmiot3, WierszFaktury, StawkiVat, Adnotacje } from "../ksef/xml-generator";
import { calculateInvoiceTotals } from "./invoice-schema";

interface ParserContext {
  company: {
    name: string;
    nip: string;
    addressData: {
      street: string;
      buildingNumber: string;
      city: string;
      postalCode: string;
      countryCode: string;
    };
  };
}

/**
 * Parses InvoiceFormData to KsefFakturaInput
 */
export function parseInvoiceToKsef(
  formData: InvoiceFormData,
  context: ParserContext
): KsefFakturaInput {
  // Calculate totals - unified function handles all invoice types
  const totals = calculateInvoiceTotals(formData);

  // Format current date/time for DataWytworzenia
  const now = new Date();
  const dataWytworzenia = now.toISOString();

  // Parse Podmiot1 (Seller/Sprzedawca)
  const podmiot1: Podmiot1 = {
    PrefiksPodatnika: "PL",
    DaneIdentyfikacyjne: {
      NIP: context.company.nip,
      Nazwa: context.company.name,
    },
    Adres: formatAddress(context.company.addressData),
  };

  // Parse Podmiot2 (Buyer/Nabywca)
  const podmiot2: Podmiot2 = {
    DaneIdentyfikacyjne: {
      ...(formData.buyer.nip ? { NIP: formData.buyer.nip } : { BrakID: true }),
      Nazwa: formData.buyer.name,
    },
    Adres: formatAddress(formData.buyer.address),
  };

  // Parse Podmiot3 (Recipient/Odbiorca) - if different from buyer
  const podmiot3: Podmiot3[] | undefined = formData.hasRecipient && formData.recipient
    ? [{
        DaneIdentyfikacyjne: {
          ...(formData.recipient.nip ? { NIP: formData.recipient.nip } : { BrakID: true }),
          Nazwa: formData.recipient.name,
        },
        Adres: formatAddress(formData.recipient.address),
        Rola: 1, // Odbiorca
      }]
    : undefined;

  // Parse invoice items to Wiersze
  const wiersze: WierszFaktury[] = formData.items.map((item, index) => {
    if (formData.type === "CORRECTION") {
      // Correction invoice - use "after" values
      const correctionItem = item as CorrectionItemFormData;
      const quantityAfter = parseFloat(correctionItem.quantityAfter);
      const netPriceAfter = parseFloat(correctionItem.netPriceAfter);
      const netValue = quantityAfter * netPriceAfter;
      
      let vatValue = 0;
      if (correctionItem.vatRateAfter !== "zw" && correctionItem.vatRateAfter !== "np" && correctionItem.vatRateAfter !== "oo") {
        const vatRateNum = parseFloat(correctionItem.vatRateAfter);
        vatValue = (netValue * vatRateNum) / 100;
      }
      
      const grossValue = netValue + vatValue;

      return {
        NrWierszaFa: index + 1,
        P_7: correctionItem.name,
        P_8A: correctionItem.unit,
        P_8B: quantityAfter.toFixed(3),
        P_9A: netPriceAfter.toString(),
        P_11: netValue.toFixed(2),
        P_11A: grossValue.toFixed(2),
        P_11Vat: vatValue.toFixed(2),
        P_12: correctionItem.vatRateAfter,
        GTU: correctionItem.gtuCode || undefined,
        PKWiU: undefined,
        CN: undefined,
      };
    } else {
      // Standard invoice (VAT, ADVANCE)
      const standardItem = item as InvoiceItemFormData;
      const quantity = parseFloat(standardItem.quantity);
      const netPrice = parseFloat(standardItem.netPrice);
      const netValue = quantity * netPrice;
      
      let vatValue = 0;
      if (standardItem.vatRate !== "zw" && standardItem.vatRate !== "np" && standardItem.vatRate !== "oo") {
        const vatRateNum = parseFloat(standardItem.vatRate);
        vatValue = (netValue * vatRateNum) / 100;
      }
      
      const grossValue = netValue + vatValue;

      return {
        NrWierszaFa: index + 1,
        P_7: standardItem.name,
        P_8A: standardItem.unit,
        P_8B: quantity.toFixed(3),
        P_9A: netPrice.toString(),
        P_11: netValue.toFixed(2),
        P_11A: grossValue.toFixed(2),
        P_11Vat: vatValue.toFixed(2),
        P_12: standardItem.vatRate,
        GTU: standardItem.gtuCode || undefined,
        PKWiU: standardItem.pkwiu || undefined,
        CN: standardItem.cn || undefined,
      };
    }
  });

  // Parse VAT rates breakdown (StawkiVat)
  const stawki: StawkiVat = {
    Stawka23: totals.vatBreakdown.find((v) => v.vatRate === "23")
      ? {
          Netto: totals.vatBreakdown.find((v) => v.vatRate === "23")!.netValue,
          Vat: totals.vatBreakdown.find((v) => v.vatRate === "23")!.vatValue,
        }
      : undefined,
    Stawka8: totals.vatBreakdown.find((v) => v.vatRate === "8")
      ? {
          Netto: totals.vatBreakdown.find((v) => v.vatRate === "8")!.netValue,
          Vat: totals.vatBreakdown.find((v) => v.vatRate === "8")!.vatValue,
        }
      : undefined,
    Stawka5: totals.vatBreakdown.find((v) => v.vatRate === "5")
      ? {
          Netto: totals.vatBreakdown.find((v) => v.vatRate === "5")!.netValue,
          Vat: totals.vatBreakdown.find((v) => v.vatRate === "5")!.vatValue,
        }
      : undefined,
    Stawka0_Kraj: totals.vatBreakdown.find((v) => v.vatRate === "0")?.netValue || undefined,
    Zwolnione: totals.vatBreakdown.find((v) => v.vatRate === "zw")?.netValue || undefined,
    PozaTerytorium: totals.vatBreakdown.find((v) => v.vatRate === "np")?.netValue || undefined,
    OdwrotneObciazenie: totals.vatBreakdown.find((v) => v.vatRate === "oo")?.netValue || undefined,
  };

  // Parse Adnotacje (Flags)
  const adnotacje: Adnotacje = {
    P_16: formData.cashMethod ? 1 : 2, // Metoda kasowa
    P_17: formData.selfBilling ? 1 : 2, // Samofakturowanie
    P_18: formData.reverseCharge ? 1 : 2, // Odwrotne obciążenie
    P_18A: formData.splitPayment ? 1 : 2, // Split payment (MPP)
    Zwolnienie: {
      // TODO: Add exemption reason parsing if needed
      P_19N: 1, // Brak zwolnienia (default)
    },
    NoweSrodkiTransportu: {
      P_22N: 1, // Brak nowych środków transportu (default)
    },
    P_23: 2, // Procedura uproszczona: Nie (default)
    PMarzy: {
      P_PMarzyN: 1, // Brak marży (default)
    },
  };

  // Determine RodzajFaktury
  let rodzajFaktury: 'VAT' | 'KOR' | 'ZAL' | 'ROZ' | 'UPR' | 'KOR_ZAL' | 'KOR_ROZ';
  if (formData.type === "VAT") {
    rodzajFaktury = "VAT";
  } else if (formData.type === "CORRECTION") {
    rodzajFaktury = "KOR";
  } else if (formData.type === "ADVANCE") {
    rodzajFaktury = "ZAL";
  } else {
    rodzajFaktury = "VAT"; // fallback
  }

  // Build KsefFakturaInput
  const ksefInput: KsefFakturaInput = {
    DataWytworzenia: dataWytworzenia,
    SystemInfo: "Invoice Manager",
    Podmiot1: podmiot1,
    Podmiot2: podmiot2,
    Podmiot3: podmiot3,
    KodWaluty: formData.currency,
    P_1: formData.issueDate,
    P_2: formData.number,
    P_6: formData.saleDate,
    Stawki: stawki,
    P_15: totals.totalGross,
    Adnotacje: adnotacje,
    RodzajFaktury: rodzajFaktury,
    Wiersze: wiersze,
  };

  // Add correction-specific fields
  if (formData.type === "CORRECTION") {
    ksefInput.PrzyczynaKorekty = formData.correctionReason;
    ksefInput.TypKorekty = 1; // TODO: Determine correct type based on correction reason
    ksefInput.DaneFaKorygowanej = [{
      Data: formData.originalInvoice.issueDate,
      NrFa: formData.originalInvoice.number,
      ...(formData.originalInvoice.ksefNumber
        ? { NrKSeF: formData.originalInvoice.ksefNumber }
        : { NrKSeFN: 1 }),
    }];
  }

  // Add advance-specific fields
  if (formData.type === "ADVANCE") {
    ksefInput.FakturaZaliczkowa = formData.orderDetails.orderNumber
      ? [{
          NrFa: formData.orderDetails.orderNumber,
        }]
      : undefined;
  }

  // Add payment information
  if (formData.paymentDeadline || formData.paymentMethod) {
    ksefInput.Platnosc = {
      FormaPlatnosci: getPaymentMethodCode(formData.paymentMethod),
      ...(formData.paymentDeadline
        ? {
            TerminPlatnosci: [{
              Termin: formData.paymentDeadline,
            }],
          }
        : {}),
      ...(formData.bankAccount
        ? {
            RachunekBankowy: [{
              NrRB: formData.bankAccount,
            }],
          }
        : {}),
    };
  }

  // Add notes if present
  if (formData.notes) {
    ksefInput.DodatkowyOpis = [{
      Klucz: "Uwagi",
      Wartosc: formData.notes,
    }];
  }

  return ksefInput;
}

/**
 * Formats address data to KSeF Adres format
 */
function formatAddress(address: {
  street: string;
  buildingNumber: string;
  flatNumber?: string;
  city: string;
  postalCode: string;
  countryCode: string;
}): Adres {
  const adresL1 = address.flatNumber
    ? `${address.street} ${address.buildingNumber}/${address.flatNumber}`
    : `${address.street} ${address.buildingNumber}`;
  
  const adresL2 = `${address.postalCode} ${address.city}`;

  return {
    KodKraju: address.countryCode,
    AdresL1: adresL1,
    AdresL2: adresL2,
  };
}

/**
 * Maps payment method to KSeF FormaPlatnosci code
 */
function getPaymentMethodCode(method: "transfer" | "cash" | "card"): number {
  switch (method) {
    case "transfer":
      return 6; // Przelew
    case "cash":
      return 1; // Gotówka
    case "card":
      return 2; // Karta płatnicza
    default:
      return 6; // Default to transfer
  }
}

