/**
 * Formatting Utilities
 * Helper functions for formatting dates, numbers, and currencies
 */

/**
 * Formats date to Polish locale
 * 
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pl-PL", options).format(dateObj);
}

/**
 * Formats date to short format (DD.MM.YYYY)
 */
export function formatDateShort(date: Date | string): string {
  return formatDate(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Formats date with time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats currency (PLN by default)
 * 
 * @param amount - Amount to format
 * @param currency - Currency code (default: PLN)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string,
  currency: string = "PLN"
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Formats number with thousands separator
 */
export function formatNumber(value: number | string): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pl-PL").format(numValue);
}

/**
 * Formats percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats NIP (adds hyphens)
 * 
 * @param nip - NIP number (10 digits)
 * @returns Formatted NIP (XXX-XXX-XX-XX)
 */
export function formatNip(nip: string): string {
  if (nip.length !== 10) return nip;
  return `${nip.slice(0, 3)}-${nip.slice(3, 6)}-${nip.slice(6, 8)}-${nip.slice(8, 10)}`;
}

/**
 * Formats file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Gets relative time string (e.g., "2 dni temu")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "przed chwilą";
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 30) return `${diffDays} dni temu`;

  return formatDateShort(dateObj);
}



