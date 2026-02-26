import { supabase } from "@/integrations/supabase/client";

// ── Rentals ──

export async function fetchRentals() {
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertRental(rental: {
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
  delivered_by: string;
  picked_up_by: string;
  entry_time: string;
  exit_time: string;
  created_by: string;
}) {
  const { error } = await supabase.from("rentals").insert(rental);
  if (error) throw error;
}

export async function updateRentalStatus(id: string, status: string) {
  const { error } = await supabase
    .from("rentals")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// ── Cash Entries ──

export async function fetchCashEntries() {
  const { data, error } = await supabase
    .from("cash_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTodayCashEntries() {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("cash_entries")
    .select("*")
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59.999`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertCashEntry(entry: {
  type: string;
  amount: number;
  description: string;
  category?: string;
  created_by: string;
}) {
  const { error } = await supabase.from("cash_entries").insert(entry);
  if (error) throw error;
}

export async function updateCashEntry(id: string, updates: { amount?: number; description?: string }) {
  const { error } = await supabase
    .from("cash_entries")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCashEntry(id: string) {
  const { error } = await supabase
    .from("cash_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Daily Closes ──

export async function fetchDailyCloses() {
  const { data, error } = await supabase
    .from("daily_closes")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertDailyClose(close: {
  date: string;
  total_income: number;
  total_expense: number;
  balance: number;
  closed_by: string;
}) {
  const { error } = await supabase.from("daily_closes").insert(close);
  if (error) throw error;
}

export async function isTodayClosed() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_closes")
    .select("id")
    .eq("date", today)
    .maybeSingle();
  return !!data;
}
