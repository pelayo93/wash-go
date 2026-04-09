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

export async function updateRentalStatus(
  id: string,
  status: string,
  extras?: {
    pickedUpBy?: string;
    exitTime?: string;
    serviceType?: string;
    price?: number;
    extraHours?: number;
    floorSurcharge?: number;
    total?: number;
    floor?: string;
    paymentMethod?: string;
    paymentSplit?: boolean;
    paymentCashAmount?: number;
    paymentTransferAmount?: number;
    paymentPending?: boolean;
  }
) {
  const updates: Record<string, any> = { status };
  if (extras?.pickedUpBy !== undefined) updates.picked_up_by = extras.pickedUpBy;
  if (extras?.exitTime) updates.exit_time = extras.exitTime;
  if (extras?.serviceType) updates.service_type = extras.serviceType;
  if (extras?.price !== undefined) updates.price = extras.price;
  if (extras?.extraHours !== undefined) updates.extra_hours = extras.extraHours;
  if (extras?.floorSurcharge !== undefined) updates.floor_surcharge = extras.floorSurcharge;
  if (extras?.total !== undefined) updates.total = extras.total;
  if (extras?.floor) updates.floor_number = extras.floor;
  if (extras?.paymentMethod !== undefined) updates.payment_method = extras.paymentMethod;
  if (extras?.paymentSplit !== undefined) updates.payment_split = extras.paymentSplit;
  if (extras?.paymentCashAmount !== undefined) updates.payment_cash_amount = extras.paymentCashAmount;
  if (extras?.paymentTransferAmount !== undefined) updates.payment_transfer_amount = extras.paymentTransferAmount;
  if (extras?.paymentPending !== undefined) updates.payment_pending = extras.paymentPending;
  const { error } = await supabase
    .from("rentals")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRental(id: string) {
  const { error } = await supabase.from("rentals").delete().eq("id", id);
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

// ── Delivery People ──

export async function fetchDeliveryPeople() {
  const { data, error } = await supabase
    .from("delivery_people")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function insertDeliveryPerson(person: {
  name: string;
  phone: string;
  created_by: string;
}) {
  const { error } = await supabase.from("delivery_people").insert(person);
  if (error) throw error;
}

export async function updateDeliveryPerson(id: string, updates: { name?: string; phone?: string; active?: boolean }) {
  const { error } = await supabase.from("delivery_people").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteDeliveryPerson(id: string) {
  const { error } = await supabase.from("delivery_people").update({ active: false }).eq("id", id);
  if (error) throw error;
}

// ── Zones ──

export async function fetchZones() {
  const { data, error } = await supabase
    .from("zones")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function insertZone(name: string) {
  const { error } = await supabase.from("zones").insert({ name });
  if (error) throw error;
}

export async function updateZone(id: string, updates: { name?: string; active?: boolean }) {
  const { error } = await supabase.from("zones").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteZone(id: string) {
  const { error } = await supabase.from("zones").update({ active: false }).eq("id", id);
  if (error) throw error;
}

// ── Zone Prices ──

export async function fetchZonePrices(zoneId?: string) {
  let query = supabase.from("zone_prices").select("*").eq("active", true).order("service_name");
  if (zoneId) query = query.eq("zone_id", zoneId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function upsertZonePrice(zoneId: string, serviceName: string, price: number) {
  const { data: existing } = await supabase
    .from("zone_prices")
    .select("id")
    .eq("zone_id", zoneId)
    .eq("service_name", serviceName)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("zone_prices").update({ price, active: true }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("zone_prices").insert({ zone_id: zoneId, service_name: serviceName, price });
    if (error) throw error;
  }
}

export async function deleteZonePrice(id: string) {
  const { error } = await supabase.from("zone_prices").update({ active: false }).eq("id", id);
  if (error) throw error;
}

// ── Cash Audit Log ──

// ── App Settings ──

export async function fetchAppSettings(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("app_settings").select("*");
  if (error) throw error;
  const map: Record<string, number> = {};
  (data ?? []).forEach((s: any) => { map[s.key] = s.value; });
  return map;
}

export async function updateAppSetting(key: string, value: number) {
  const { error } = await supabase
    .from("app_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw error;
}

// ── Payment Methods ──

export async function fetchPaymentMethods() {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function insertPaymentMethod(name: string) {
  const { error } = await supabase.from("payment_methods").insert({ name });
  if (error) throw error;
}

export async function deletePaymentMethod(id: string) {
  const { error } = await supabase.from("payment_methods").update({ active: false }).eq("id", id);
  if (error) throw error;
}

// ── Clients ──

export async function fetchClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function insertClient(client: { name: string; phone: string; address: string; created_by: string }) {
  const { data, error } = await supabase.from("clients").insert(client).select().single();
  if (error) throw error;
  return data;
}

export async function updateRentalPaymentPending(id: string, pending: boolean) {
  const { error } = await supabase.from("rentals").update({ payment_pending: pending }).eq("id", id);
  if (error) throw error;
}

// ── Cash Audit Log ──

export async function insertCashAuditLog(entry: {
  action: string;
  cash_entry_id?: string;
  details: Record<string, any>;
  performed_by: string;
}) {
  const { error } = await supabase.from("cash_audit_log").insert(entry);
  if (error) throw error;
}

export async function fetchCashAuditLog() {
  const { data, error } = await supabase
    .from("cash_audit_log")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
