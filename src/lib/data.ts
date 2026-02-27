// Zone pricing configuration
export interface ZonePricing {
  name: string;
  prices: Record<string, number>;
}

export const ZONES: ZonePricing[] = [
  {
    name: "Itagüí",
    prices: { "3h": 16000, "Día": 26000, "Amanecida": 22000, "24h": 32000, "Promo": 42000 },
  },
  {
    name: "Envigado y Sabaneta",
    prices: { "24h": 37000, "Promo": 47000 },
  },
  {
    name: "Villalia, San Gabriel, Limonar, San Francisco",
    prices: { "Amanecida": 27000, "24h": 37000, "Promo": 47000 },
  },
  {
    name: "Prado y Estrella",
    prices: { "24h": 37000, "Promo": 47000 },
  },
  {
    name: "Colinitas y Cristo Rey",
    prices: { "Amanecida": 27000, "24h": 37000, "Promo": 47000 },
  },
  {
    name: "Belén y Tablaza",
    prices: { "24h": 42000, "Promo": 52000 },
  },
];

export const EXTRA_HORA = 3000;
export const PISO_EXTRA: Record<string, number> = {
  "3-4": 1000,
  "5-6": 2000,
};

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);
}
