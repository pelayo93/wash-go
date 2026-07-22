// ─────────────────────────────────────────────
//  wash-go — Tipos centrales de la aplicación
// ─────────────────────────────────────────────

// ── Rental ──────────────────────────────────
export interface Rental {
  id: string;
  client_name: string;
  phone: string;
  address: string;
  zone: string;
  service_type: string;
  price: number;
  extra_hours: number;
  floor_surcharge: number;
  total: number;
  floor_number: string;
  washer_number: string | null;
  washer_brand: string | null;
  delivered_by: string;
  picked_up_by: string | null;
  entry_time: string;
  exit_time: string | null;
  status: "active" | "completed" | "cancelled";
  payment_method: string | null;
  payment_split: boolean;
  payment_cash_amount: number | null;
  payment_transfer_amount: number | null;
  payment_pending: boolean;
  payment_prepaid: boolean;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

// ── CashEntry ────────────────────────────────
export interface CashEntry {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string | null;
  created_by: string | null;
  created_at: string;
}

// ── DailyClose ───────────────────────────────
export interface DailyClose {
  id: string;
  date: string;
  total_income: number;
  total_expense: number;
  balance: number;
  closed_by: string;
  created_at: string;
}

// ── DeliveryPerson ───────────────────────────
export interface DeliveryPerson {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

// ── Zone ─────────────────────────────────────
export interface Zone {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

// ── ZonePrice ────────────────────────────────
export interface ZonePrice {
  id: string;
  zone_id: string;
  service_name: string;
  price: number;
  active: boolean;
  created_at: string;
}

// ── PaymentMethod ────────────────────────────
export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

// ── Client ───────────────────────────────────
export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

// ── CashAuditLog ─────────────────────────────
export interface CashAuditLogCreateDetails {
  type: "income" | "expense";
  amount: number;
  description: string;
}
export interface CashAuditLogUpdateDetails {
  old: { amount: number; description: string };
  new: { amount: number; description: string };
}
export interface CashAuditLogDailyCloseDetails {
  date: string;
  income: number;
  expense: number;
  balance: number;
}
export interface CashAuditLog {
  id: string;
  action: string;
  cash_entry_id: string | null;
  details: CashAuditLogCreateDetails | CashAuditLogUpdateDetails | CashAuditLogDailyCloseDetails;
  performed_by: string;
  created_at: string;
}

// ── AppSettings ──────────────────────────────
export type AppSettings = Record<string, number>;

// ── Dashboard summary ────────────────────────
export interface DaySummary {
  income: number;
  expense: number;
  balance: number;
}
