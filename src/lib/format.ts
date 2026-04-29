import type { Money } from "./shopify/types";

export function formatMoney({ amount, currencyCode }: Money): string {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}
