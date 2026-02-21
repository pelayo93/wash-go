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

// Types
export interface Rental {
  id: string;
  clientName: string;
  phone: string;
  address: string;
  zone: string;
  serviceType: string;
  price: number;
  extraHours: number;
  floorSurcharge: number;
  total: number;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
}

export interface CashEntry {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category?: string;
  createdAt: string;
}

export interface DailyClose {
  id: string;
  date: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  entries: CashEntry[];
}

// LocalStorage helpers
const RENTALS_KEY = "lavadoras_rentals";
const CASH_KEY = "lavadoras_cash";
const WASHERS_KEY = "lavadoras_washers";
const DAILY_CLOSES_KEY = "lavadoras_daily_closes";

export interface WasherStatus {
  active: number;
  warehouse: number;
  maintenance: number;
}

export function getWasherStatus(): WasherStatus {
  const stored = localStorage.getItem(WASHERS_KEY);
  return stored ? JSON.parse(stored) : { active: 0, warehouse: 0, maintenance: 0 };
}

export function saveWasherStatus(status: WasherStatus) {
  localStorage.setItem(WASHERS_KEY, JSON.stringify(status));
}

export function getRentals(): Rental[] {
  const stored = localStorage.getItem(RENTALS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveRental(rental: Rental) {
  const rentals = getRentals();
  rentals.unshift(rental);
  localStorage.setItem(RENTALS_KEY, JSON.stringify(rentals));
}

export function updateRental(id: string, updates: Partial<Rental>) {
  const rentals = getRentals().map(r => r.id === id ? { ...r, ...updates } : r);
  localStorage.setItem(RENTALS_KEY, JSON.stringify(rentals));
}

export function getCashEntries(): CashEntry[] {
  const stored = localStorage.getItem(CASH_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveCashEntry(entry: CashEntry) {
  const entries = getCashEntries();
  entries.unshift(entry);
  localStorage.setItem(CASH_KEY, JSON.stringify(entries));
}

export function updateCashEntry(id: string, updates: Partial<CashEntry>) {
  const entries = getCashEntries().map(e => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem(CASH_KEY, JSON.stringify(entries));
}

export function deleteCashEntry(id: string) {
  const entries = getCashEntries().filter(e => e.id !== id);
  localStorage.setItem(CASH_KEY, JSON.stringify(entries));
}

export function getTodayEntries(): CashEntry[] {
  const today = new Date().toISOString().split("T")[0];
  return getCashEntries().filter(e => e.createdAt.startsWith(today));
}

export function getTodaySummary() {
  const entries = getTodayEntries();
  const income = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  return { income, expense, balance: income - expense };
}

// Daily closes
export function getDailyCloses(): DailyClose[] {
  const stored = localStorage.getItem(DAILY_CLOSES_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveDailyClose(close: DailyClose) {
  const closes = getDailyCloses();
  closes.unshift(close);
  localStorage.setItem(DAILY_CLOSES_KEY, JSON.stringify(closes));
}

export function isTodayClosed(): boolean {
  const today = new Date().toISOString().split("T")[0];
  return getDailyCloses().some(c => c.date === today);
}

export function closeTodayCash(): DailyClose {
  const today = new Date().toISOString().split("T")[0];
  const todayEntries = getTodayEntries();
  const income = todayEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = todayEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const close: DailyClose = {
    id: generateId(),
    date: today,
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense,
    entries: todayEntries,
  };
  saveDailyClose(close);
  return close;
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
