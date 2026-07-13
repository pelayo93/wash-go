import { useState, useEffect, useCallback } from "react";
import type { Rental, DeliveryPerson, Client, PaymentMethod } from "@/types";
import {
  WashingMachine, Plus, Phone, MapPin, User, Check, Clock, UserCheck, CreditCard, Flame, Trash2, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCOP } from "@/lib/data";
import { useZones } from "@/hooks/useZones";
import { useSurcharges } from "@/hooks/useSurcharges";
import { fetchRentals, insertRental, updateRentalStatus, updateRentalPaymentPending, insertCashEntry, fetchDeliveryPeople, fetchPaymentMethods, deleteRental, fetchClients, insertClient } from "@/lib/supabase-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DeliveryPeopleManager from "@/components/DeliveryPeopleManager";

export default function Alquileres() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "pending">("all");
  const [historyDate, setHistoryDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [deliveryPeople, setDeliveryPeople] = useState<DeliveryPerson[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const { zones: ZONES, reload: reloadZones } = useZones();
  const { surcharges } = useSurcharges();

  // Complete dialog state
  const [completingRental, setCompletingRental] = useState<Rental | null>(null);
  const [completePickedUpBy, setCompletePickedUpBy] = useState("");
  const [completeExitTime, setCompleteExitTime] = useState("");
  const [completeZone, setCompleteZone] = useState("");
  const [completeServiceType, setCompleteServiceType] = useState("");
  const [completeExtraHours, setCompleteExtraHours] = useState(0);
  const [completeFloorSurchargeCustom, setCompleteFloorSurchargeCustom] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [completePaymentMethod, setCompletePaymentMethod] = useState("");
  const [completePaymentSplit, setCompletePaymentSplit] = useState(false);
  const [completeCashAmount, setCompleteCashAmount] = useState(0);
  const [completeTransferAmount, setCompleteTransferAmount] = useState(0);
  const [completePaymentPending, setCompletePaymentPending] = useState(false);
  const [completeGasRequested, setCompleteGasRequested] = useState(false);
  const [completeGasNote, setCompleteGasNote] = useState("");
  const [completeGasPrice, setCompleteGasPrice] = useState(0);

  // Form state (simplified - no pricing fields)
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  // Solo Gas form state
  const [soloGas, setSoloGas] = useState(false);
  const [soloGasNote, setSoloGasNote] = useState("");
  const [soloGasPrice, setSoloGasPrice] = useState(0);
  const [soloGasPaymentMethod, setSoloGasPaymentMethod] = useState("");
  const [soloGasPaymentPending, setSoloGasPaymentPending] = useState(false);

  // Pago Adelantado form state (se cobra al registrar el pedido, no al completarlo)
  const [prepaid, setPrepaid] = useState(false);
  const [prepaidServiceType, setPrepaidServiceType] = useState("");
  const [prepaidExtraHours, setPrepaidExtraHours] = useState(0);
  const [prepaidFloorSurcharge, setPrepaidFloorSurcharge] = useState(0);
  const [prepaidPaymentMethod, setPrepaidPaymentMethod] = useState("");
  const [prepaidPaymentSplit, setPrepaidPaymentSplit] = useState(false);
  const [prepaidCashAmount, setPrepaidCashAmount] = useState(0);
  const [prepaidTransferAmount, setPrepaidTransferAmount] = useState(0);

  // Collect pending payment state
  const [collectingRental, setCollectingRental] = useState<any | null>(null);
  const [collectPaymentMethod, setCollectPaymentMethod] = useState("");
  const [collectPaymentSplit, setCollectPaymentSplit] = useState(false);
  const [collectCashAmount, setCollectCashAmount] = useState(0);
  const [collectTransferAmount, setCollectTransferAmount] = useState(0);

  // Complete dialog pricing
  const completeZoneObj = ZONES.find((z) => z.name === completeZone);
  const completeServiceTypes = completeZoneObj ? Object.keys(completeZoneObj.prices) : [];
  const completeBasePrice = completeZoneObj && completeServiceType ? completeZoneObj.prices[completeServiceType] || 0 : 0;
  const completeFloorSurcharge = completeFloorSurchargeCustom;
  const completeTotal = completeBasePrice + completeExtraHours * surcharges.extraHora + completeFloorSurcharge + (completeGasRequested ? completeGasPrice : 0);
  const isPrepaidCompletion = completingRental?.payment_prepaid === true;

  // Pago Adelantado pricing (usa la zona ya seleccionada en el formulario principal)
  const prepaidZoneObj = ZONES.find((z) => z.name === selectedZone);
  const prepaidServiceTypes = prepaidZoneObj ? Object.keys(prepaidZoneObj.prices) : [];
  const prepaidBasePrice = prepaidZoneObj && prepaidServiceType ? prepaidZoneObj.prices[prepaidServiceType] || 0 : 0;
  const prepaidTotal = prepaidBasePrice + prepaidExtraHours * surcharges.extraHora + prepaidFloorSurcharge;

  const loadDeliveryPeople = useCallback(async () => {
    try {
      const [dp, pm, cl] = await Promise.all([fetchDeliveryPeople(), fetchPaymentMethods(), fetchClients()]);
      setDeliveryPeople(dp);
      setPaymentMethods(pm);
      setClients(cl);
    } catch (err) { console.error(err); }
  }, []);

  const loadRentals = useCallback(async () => {
    try { setRentals(await fetchRentals()); } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRentals(); loadDeliveryPeople(); }, [loadRentals, loadDeliveryPeople]);

  useEffect(() => {
    const channel = supabase
      .channel("rentals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rentals" }, () => {
        loadRentals();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRentals]);

  const resetForm = () => {
    setClientName(""); setPhone(""); setAddress("");
    setSelectedZone(""); setFloorNumber("");
    setDeliveredBy(""); setEntryTime("");
    setSoloGas(false); setSoloGasNote(""); setSoloGasPrice(0);
    setSoloGasPaymentMethod(""); setSoloGasPaymentPending(false);
    setPrepaid(false); setPrepaidServiceType(""); setPrepaidExtraHours(0);
    setPrepaidFloorSurcharge(0); setPrepaidPaymentMethod(""); setPrepaidPaymentSplit(false);
    setPrepaidCashAmount(0); setPrepaidTransferAmount(0);
    setSelectedClientId(null); setClientSearch("");
    setShowForm(false);
  };

  const openCompleteDialog = (rental: Rental) => {
    setCompletingRental(rental);
    setCompleteZone(rental.zone || "");
    setCompleteServiceType("");
    setCompleteExtraHours(0);
    setCompleteFloorSurchargeCustom(0);
    setCompletePickedUpBy("");
    setCompleteExitTime("");
    setCompletePaymentMethod("");
    setCompletePaymentSplit(false);
    setCompleteCashAmount(0);
    setCompleteTransferAmount(0);
    setCompletePaymentPending(false);
    // Pre-fill gas if this is a Solo Gas rental
    const isSoloGas = rental.service_type === "Solo Gas";
    setCompleteGasRequested(isSoloGas);
    setCompleteGasNote("");
    setCompleteGasPrice(isSoloGas ? rental.price : 0);
  };

  const closeCompleteDialog = () => {
    setCompletingRental(null);
    setCompletePickedUpBy("");
    setCompleteExitTime("");
    setCompleteZone("");
    setCompleteServiceType("");
    setCompleteExtraHours(0);
    setCompleteFloorSurchargeCustom(0);
    setCompletePaymentMethod("");
    setCompletePaymentSplit(false);
    setCompleteCashAmount(0);
    setCompleteTransferAmount(0);
    setCompletePaymentPending(false);
    setCompleteGasRequested(false);
    setCompleteGasNote("");
    setCompleteGasPrice(0);
  };

  const handleSubmit = async () => {
    if (!clientName || !selectedZone) {
      toast({ title: "Completa el nombre del cliente y la zona", variant: "destructive" });
      return;
    }
    // Save new client if not selected from list
    if (!selectedClientId && clientName.trim()) {
      try {
        const newClient = await insertClient({ name: clientName.trim(), phone, address, created_by: user!.id });
        setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) { console.error("Error saving client:", err); }
    }
    if (prepaid) {
      if (!prepaidServiceType) {
        toast({ title: "Selecciona el tipo de servicio", variant: "destructive" });
        return;
      }
      if (!prepaidPaymentSplit && !prepaidPaymentMethod) {
        toast({ title: "Selecciona el método de pago", variant: "destructive" });
        return;
      }
      if (prepaidPaymentSplit && (prepaidCashAmount + prepaidTransferAmount) !== prepaidTotal) {
        toast({ title: "Los montos divididos deben sumar el total", variant: "destructive" });
        return;
      }
      try {
        const paymentMethodLabel = prepaidPaymentSplit ? "Dividido" : prepaidPaymentMethod;
        await insertRental({
          client_name: clientName, phone, address,
          zone: selectedZone, service_type: prepaidServiceType,
          price: prepaidBasePrice, extra_hours: prepaidExtraHours,
          floor_surcharge: prepaidFloorSurcharge, total: prepaidTotal,
          floor_number: floorNumber, delivered_by: deliveredBy,
          picked_up_by: "", entry_time: entryTime,
          exit_time: "", created_by: user!.id,
          payment_method: paymentMethodLabel,
          payment_prepaid: true,
          payment_pending: false,
          payment_split: prepaidPaymentSplit,
          payment_cash_amount: prepaidPaymentSplit ? prepaidCashAmount : 0,
          payment_transfer_amount: prepaidPaymentSplit ? prepaidTransferAmount : 0,
        });
        // El ingreso se registra HOY, el día del pago adelantado — no se vuelve a cobrar al completar
        await insertCashEntry({
          type: "income",
          amount: prepaidTotal,
          description: `Pago adelantado - ${clientName} (${selectedZone}) ${prepaidServiceType}${prepaidPaymentSplit ? " [Dividido]" : ` [${prepaidPaymentMethod}]`}`,
          category: "alquiler",
          created_by: user!.id,
        });
        resetForm();
        toast({ title: "Pedido registrado con pago adelantado ✓ — Usa 'Completar' solo para marcar el retiro" });
      } catch (err: any) {
        toast({ title: err.message || "Error al registrar", variant: "destructive" });
      }
      return;
    }
    if (soloGas) {
      if (soloGasPrice <= 0) {
        toast({ title: "Ingresa el precio del gas", variant: "destructive" });
        return;
      }
      try {
        // Register as active so it can be completed later with additional services
        await insertRental({
          client_name: clientName, phone, address,
          zone: selectedZone, service_type: "Solo Gas",
          price: soloGasPrice, extra_hours: 0,
          floor_surcharge: 0, total: soloGasPrice,
          floor_number: floorNumber, delivered_by: deliveredBy,
          picked_up_by: "", entry_time: entryTime,
          exit_time: "", created_by: user!.id,
        });
        resetForm();
        toast({ title: "Pedido de gas registrado ✓ — Usa 'Completar' para finalizar o agregar servicios" });
      } catch (err: any) {
        toast({ title: err.message || "Error al registrar", variant: "destructive" });
      }
      return;
    }
    try {
      await insertRental({
        client_name: clientName, phone, address,
        zone: selectedZone, service_type: "",
        price: 0, extra_hours: 0,
        floor_surcharge: 0, total: 0,
        floor_number: floorNumber, delivered_by: deliveredBy,
        picked_up_by: "", entry_time: entryTime,
        exit_time: "", created_by: user!.id,
      });
      resetForm();
      toast({ title: "Pedido registrado ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error al registrar", variant: "destructive" });
    }
  };

  const completeRental = async () => {
    if (!completingRental) return;

    // Pago Adelantado: ya se cobró el día del pedido. Al completar solo se
    // registra quién retiró y la hora — no se pide método de pago ni se
    // genera un nuevo ingreso en Caja (ya se registró cuando se pagó).
    if (isPrepaidCompletion) {
      try {
        await updateRentalStatus(completingRental.id, "completed", {
          pickedUpBy: completePickedUpBy,
          exitTime: completeExitTime,
        });
        closeCompleteDialog();
        toast({ title: "Completado ✓ (ya estaba pagado por adelantado)" });
      } catch (err: any) {
        toast({ title: err.message || "Error", variant: "destructive" });
      }
      return;
    }

    const isSoloGasOnly = !completeServiceType && completeGasRequested && completeGasPrice > 0;
    if (!completingRental || (!completeServiceType && !isSoloGasOnly)) {
      toast({ title: "Selecciona un tipo de servicio o registra gas", variant: "destructive" });
      return;
    }
    if (!completePaymentPending && !completePaymentSplit && !completePaymentMethod) {
      toast({ title: "Selecciona el método de pago", variant: "destructive" });
      return;
    }
    if (completePaymentSplit && (completeCashAmount + completeTransferAmount) !== completeTotal) {
      toast({ title: "Los montos divididos deben sumar el total", variant: "destructive" });
      return;
    }
    try {
      const isPending = completePaymentPending;
      const finalServiceType = isSoloGasOnly ? "Solo Gas" : completeServiceType;
      const description = isSoloGasOnly
        ? `Solo Gas - ${completingRental.client_name} (${completeZone})${completeGasNote ? ` (${completeGasNote})` : ""}${completePaymentSplit ? " [Dividido]" : ` [${completePaymentMethod}]`}`
        : `Alquiler ${completeServiceType} - ${completingRental.client_name} (${completeZone})${completeGasRequested && completeGasPrice > 0 ? ` + Gas ${formatCOP(completeGasPrice)}${completeGasNote ? ` (${completeGasNote})` : ""}` : ""}${completePaymentSplit ? " [Dividido]" : ` [${completePaymentMethod}]`}`;

      await updateRentalStatus(completingRental.id, "completed", {
        pickedUpBy: completePickedUpBy,
        exitTime: completeExitTime,
        serviceType: finalServiceType,
        price: isSoloGasOnly ? completeGasPrice : completeBasePrice,
        extraHours: completeExtraHours,
        floorSurcharge: completeFloorSurcharge,
        total: completeTotal,
        floor: completeFloorSurcharge > 0 ? `+${completeFloorSurcharge}` : "1-2",
        paymentMethod: isPending ? "Pago pendiente" : completePaymentSplit ? "Dividido" : completePaymentMethod,
        paymentSplit: completePaymentSplit,
        paymentCashAmount: completePaymentSplit ? completeCashAmount : 0,
        paymentTransferAmount: completePaymentSplit ? completeTransferAmount : 0,
        paymentPending: isPending,
      });
      if (!isPending) {
        await insertCashEntry({
          type: "income", amount: completeTotal,
          description,
          category: isSoloGasOnly ? "gas" : "alquiler", created_by: user!.id,
        });
      }
      closeCompleteDialog();
      toast({ title: isPending ? "Completado (pago pendiente) ✓" : "Completado ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  const openCollectDialog = (rental: Rental) => {
    setCollectingRental(rental);
    setCollectPaymentMethod("");
    setCollectPaymentSplit(false);
    setCollectCashAmount(0);
    setCollectTransferAmount(0);
  };

  const collectPayment = async () => {
    if (!collectingRental) return;
    if (!collectPaymentSplit && !collectPaymentMethod) {
      toast({ title: "Selecciona el método de pago", variant: "destructive" });
      return;
    }
    if (collectPaymentSplit && (collectCashAmount + collectTransferAmount) !== collectingRental.total) {
      toast({ title: "Los montos divididos deben sumar el total", variant: "destructive" });
      return;
    }
    try {
      await updateRentalStatus(collectingRental.id, "completed", {
        paymentMethod: collectPaymentSplit ? "Dividido" : collectPaymentMethod,
        paymentSplit: collectPaymentSplit,
        paymentCashAmount: collectPaymentSplit ? collectCashAmount : 0,
        paymentTransferAmount: collectPaymentSplit ? collectTransferAmount : 0,
        paymentPending: false,
      });
      await insertCashEntry({
        type: "income",
        amount: collectingRental.total,
        description: `Cobro pendiente - ${collectingRental.client_name} (${collectingRental.zone}) ${collectingRental.service_type}${collectPaymentSplit ? " [Dividido]" : ` [${collectPaymentMethod}]`}`,
        category: collectingRental.service_type === "Solo Gas" ? "gas" : "alquiler",
        created_by: user!.id,
      });
      setCollectingRental(null);
      toast({ title: "Pago cobrado ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alquileres</h1>
          <p className="text-sm text-muted-foreground">Gestión de servicios por zona</p>
        </div>
        <div className="flex gap-2">
          {role === "admin" && <DeliveryPeopleManager onUpdate={loadDeliveryPeople} />}
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nuevo Pedido
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="card-highlight">
          <CardHeader className="pb-3">
            <CardTitle className="section-title">Registrar Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Cliente</Label>
                <div className="relative">
                  <Input
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      setClientSearch(e.target.value);
                      setSelectedClientId(null);
                      setShowClientSuggestions(true);
                    }}
                    onFocus={() => setShowClientSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                    placeholder="Buscar o crear cliente..."
                  />
                  {showClientSuggestions && clientSearch.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent truncate"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setClientName(c.name);
                            setPhone(c.phone || "");
                            setAddress(c.address || "");
                            setSelectedClientId(c.id);
                            setShowClientSuggestions(false);
                          }}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="text-muted-foreground ml-2">• {c.phone}</span>}
                        </button>
                      ))}
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Nuevo cliente — se guardará al registrar</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Teléfono (Opcional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Dirección (Opcional)</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección completa" />
              </div>
              <div className="space-y-2">
                <Label>Zona</Label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar zona" /></SelectTrigger>
                  <SelectContent>
                    {ZONES.map((z) => (<SelectItem key={z.name} value={z.name}>{z.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número de Piso</Label>
                <Input value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} placeholder="Ej: 3" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Persona que Entregó</Label>
                <Select value={deliveredBy} onValueChange={setDeliveredBy}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar repartidor" /></SelectTrigger>
                  <SelectContent>
                    {deliveryPeople.map((p) => (
                      <SelectItem key={p.id} value={p.name}>{p.name} {p.phone && `(${p.phone})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Hora de Entrada</Label>
                <Input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} />
              </div>
            </div>

            {/* Solo Gas option */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="soloGas"
                  checked={soloGas}
                  disabled={prepaid}
                  onCheckedChange={(v) => {
                    setSoloGas(!!v);
                    if (!v) { setSoloGasNote(""); setSoloGasPrice(0); setSoloGasPaymentMethod(""); setSoloGasPaymentPending(false); }
                  }}
                />
                <label htmlFor="soloGas" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" /> Solo Gas
                </label>
              </div>
              {soloGas && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nota (ej: libras, tipo)</Label>
                    <textarea
                      className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={soloGasNote}
                      onChange={(e) => setSoloGasNote(e.target.value)}
                      placeholder="Ej: 20 libras, gas propano..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio del Gas</Label>
                    <Input type="number" min={0} value={soloGasPrice} onChange={(e) => setSoloGasPrice(Number(e.target.value))} placeholder="0" />
                  </div>
                  {soloGasPrice > 0 && (
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">{formatCOP(soloGasPrice)}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">El pago se define al completar el pedido</p>
                </div>
              )}
            </div>

            {/* Pago Adelantado option */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="prepaid"
                  checked={prepaid}
                  disabled={soloGas}
                  onCheckedChange={(v) => {
                    setPrepaid(!!v);
                    if (!v) {
                      setPrepaidServiceType(""); setPrepaidExtraHours(0); setPrepaidFloorSurcharge(0);
                      setPrepaidPaymentMethod(""); setPrepaidPaymentSplit(false);
                      setPrepaidCashAmount(0); setPrepaidTransferAmount(0);
                    }
                  }}
                />
                <label htmlFor="prepaid" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-primary" /> Pago Adelantado
                </label>
              </div>
              {prepaid && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    El cliente ya pagó hoy. El ingreso se registra en Caja ahora mismo; al retirar, solo se marca "Completar" sin volver a cobrar.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Servicio</Label>
                    <Select value={prepaidServiceType} onValueChange={setPrepaidServiceType}>
                      <SelectTrigger><SelectValue placeholder={selectedZone ? "Seleccionar servicio" : "Selecciona primero una zona"} /></SelectTrigger>
                      <SelectContent>
                        {prepaidServiceTypes.map((st) => (
                          <SelectItem key={st} value={st}>{st} - {formatCOP(prepaidZoneObj!.prices[st])}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Horas Extras ({formatCOP(surcharges.extraHora)}/h)</Label>
                      <Input type="number" min={0} value={prepaidExtraHours} onChange={(e) => setPrepaidExtraHours(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Recargo por Piso</Label>
                      <Input type="number" min={0} value={prepaidFloorSurcharge} onChange={(e) => setPrepaidFloorSurcharge(Number(e.target.value))} placeholder="0" />
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md bg-secondary/60 p-3">
                    <Label className="text-xs flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Método de Pago</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="prepaidSplit"
                        checked={prepaidPaymentSplit}
                        onCheckedChange={(v) => { setPrepaidPaymentSplit(!!v); if (v) setPrepaidPaymentMethod(""); }}
                      />
                      <label htmlFor="prepaidSplit" className="text-xs text-muted-foreground cursor-pointer">Pago dividido (efectivo + transferencia)</label>
                    </div>
                    {prepaidPaymentSplit ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Efectivo</Label>
                          <Input type="number" min={0} value={prepaidCashAmount} onChange={(e) => setPrepaidCashAmount(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Transferencia</Label>
                          <Input type="number" min={0} value={prepaidTransferAmount} onChange={(e) => setPrepaidTransferAmount(Number(e.target.value))} />
                        </div>
                        {prepaidTotal > 0 && (prepaidCashAmount + prepaidTransferAmount) !== prepaidTotal && (
                          <p className="col-span-2 text-xs text-destructive">
                            Suma: {formatCOP(prepaidCashAmount + prepaidTransferAmount)} — debe ser {formatCOP(prepaidTotal)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Select value={prepaidPaymentMethod} onValueChange={setPrepaidPaymentMethod}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((pm) => (
                            <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {prepaidTotal > 0 && (
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-border">
                      <span>Total pagado</span>
                      <span className="text-primary">{formatCOP(prepaidTotal)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-1" /> {soloGas ? "Registrar Gas" : prepaid ? "Registrar (Pagado)" : "Registrar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete rental dialog */}
      <Dialog open={!!completingRental} onOpenChange={(open) => { if (!open) closeCompleteDialog(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isPrepaidCompletion ? "Marcar Retiro (ya pagado)" : completingRental?.service_type === "Solo Gas" ? "Completar Pedido (Gas)" : "Completar Alquiler"}
              </DialogTitle>
            </DialogHeader>
          <div className="space-y-4 py-2">
            {completingRental && (
              <p className="text-sm text-muted-foreground">
                Cliente: <span className="font-medium text-foreground">{completingRental.client_name}</span> • {completingRental.zone}
                {completingRental.service_type === "Solo Gas" && (
                  <span className="ml-2"><Badge variant="outline" className="text-xs">Gas registrado: {formatCOP(completingRental.price)}</Badge></span>
                )}
              </p>
            )}

            {isPrepaidCompletion && completingRental && (
              <div className="rounded-lg bg-secondary p-4 space-y-1">
                <p className="text-sm font-medium flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Pagado por adelantado
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{completingRental.service_type} ({completingRental.zone})</span>
                  <span>{formatCOP(completingRental.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Método</span>
                  <span>{completingRental.payment_method}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Este pago ya quedó registrado en Caja el día del pedido. Solo falta marcar quién retiró y la hora de salida.
                </p>
              </div>
            )}

            {!isPrepaidCompletion && (
            <div className="space-y-2">
              <Label>Tipo de Servicio {completeGasRequested ? "(opcional si solo es gas)" : ""}</Label>
              <Select value={completeServiceType} onValueChange={setCompleteServiceType}>
                <SelectTrigger><SelectValue placeholder={completeGasRequested ? "Sin servicio adicional" : "Seleccionar servicio"} /></SelectTrigger>
                <SelectContent>
                  {completeServiceTypes.map((st) => (
                    <SelectItem key={st} value={st}>{st} - {formatCOP(completeZoneObj!.prices[st])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
            {!isPrepaidCompletion && (
            <div className="space-y-2">
              <Label>Horas Extras ({formatCOP(surcharges.extraHora)}/h)</Label>
              <Input type="number" min={0} value={completeExtraHours} onChange={(e) => setCompleteExtraHours(Number(e.target.value))} />
            </div>
            )}
            {!isPrepaidCompletion && (
            <div className="space-y-2">
              <Label>Recargo por Piso</Label>
              <Input type="number" min={0} value={completeFloorSurchargeCustom} onChange={(e) => setCompleteFloorSurchargeCustom(Number(e.target.value))} placeholder="0" />
              <p className="text-xs text-muted-foreground">Ingresa el monto del recargo (0 si no aplica)</p>
            </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Persona que Retiró</Label>
              <Select value={completePickedUpBy} onValueChange={setCompletePickedUpBy}>
                <SelectTrigger><SelectValue placeholder="Seleccionar repartidor" /></SelectTrigger>
                <SelectContent>
                  {deliveryPeople.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name} {p.phone && `(${p.phone})`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Hora de Salida</Label>
              <Input type="time" value={completeExitTime} onChange={(e) => setCompleteExitTime(e.target.value)} />
            </div>

            {/* Gas option */}
            {!isPrepaidCompletion && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="gasRequested"
                  checked={completeGasRequested}
                  onCheckedChange={(v) => {
                    setCompleteGasRequested(!!v);
                    if (!v) { setCompleteGasNote(""); setCompleteGasPrice(0); }
                  }}
                />
                <label htmlFor="gasRequested" className="text-sm font-medium cursor-pointer">¿El cliente solicitó Gas?</label>
              </div>
              {completeGasRequested && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nota (ej: libras, tipo)</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={completeGasNote}
                      onChange={(e) => setCompleteGasNote(e.target.value)}
                      placeholder="Ej: 20 libras, gas propano..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio del Gas</Label>
                    <Input type="number" min={0} value={completeGasPrice} onChange={(e) => setCompleteGasPrice(Number(e.target.value))} placeholder="0" />
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Payment method */}
            {!isPrepaidCompletion && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <Label className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Método de Pago</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="paymentPending"
                  checked={completePaymentPending}
                  onCheckedChange={(v) => {
                    setCompletePaymentPending(!!v);
                    if (v) { setCompletePaymentSplit(false); setCompletePaymentMethod(""); }
                  }}
                />
                <label htmlFor="paymentPending" className="text-sm text-muted-foreground cursor-pointer">Pago pendiente</label>
              </div>
              {!completePaymentPending && (
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="paymentSplit"
                      checked={completePaymentSplit}
                      onCheckedChange={(v) => {
                        setCompletePaymentSplit(!!v);
                        if (v) { setCompletePaymentMethod(""); }
                      }}
                    />
                    <label htmlFor="paymentSplit" className="text-sm text-muted-foreground cursor-pointer">Pago dividido (efectivo + transferencia)</label>
                  </div>
                  {completePaymentSplit ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Efectivo</Label>
                        <Input type="number" min={0} value={completeCashAmount} onChange={(e) => setCompleteCashAmount(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Transferencia</Label>
                        <Input type="number" min={0} value={completeTransferAmount} onChange={(e) => setCompleteTransferAmount(Number(e.target.value))} />
                      </div>
                      {completeTotal > 0 && (completeCashAmount + completeTransferAmount) !== completeTotal && (
                        <p className="col-span-2 text-xs text-destructive">
                          Suma: {formatCOP(completeCashAmount + completeTransferAmount)} — debe ser {formatCOP(completeTotal)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Select value={completePaymentMethod} onValueChange={setCompletePaymentMethod}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((pm) => (
                          <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
            )}

            {!isPrepaidCompletion && completeBasePrice > 0 && (
              <div className="rounded-lg bg-secondary p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base ({completeServiceType})</span>
                  <span>{formatCOP(completeBasePrice)}</span>
                </div>
                {completeExtraHours > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{completeExtraHours} hora(s) extra</span>
                    <span>{formatCOP(completeExtraHours * surcharges.extraHora)}</span>
                  </div>
                )}
                {completeFloorSurcharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recargo piso</span>
                    <span>{formatCOP(completeFloorSurcharge)}</span>
                  </div>
                )}
                {completeGasRequested && completeGasPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gas{completeGasNote && ` (${completeGasNote})`}</span>
                    <span>{formatCOP(completeGasPrice)}</span>
                  </div>
                )}
              </div>
            )}

            {!isPrepaidCompletion && (
            <div className="flex justify-between font-bold text-lg pt-3 pb-1 border-t border-border">
              <span>Total a cobrar</span>
              <span className="text-primary">{formatCOP(completeTotal)}</span>
            </div>
            )}

            <div className="flex gap-2 justify-end">
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={completeRental}>
                <Check className="h-4 w-4 mr-1" /> Completar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rental list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="section-title flex items-center gap-2">
              <WashingMachine className="h-5 w-5 text-primary" />
              Historial de Alquileres
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="h-7 text-xs w-[140px]"
              />
              {([
                ["all", "Todos"],
                ["active", "Activos"],
                ["completed", "Completados"],
                ["pending", "Pendientes"],
              ] as const).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  className="text-xs h-7"
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filtered = rentals.filter((r) => {
              const ref = r.completed_at || r.created_at;
              let rentalDate = "";
              if (ref) {
                const dt = new Date(ref);
                rentalDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
              }
              if (historyDate && rentalDate !== historyDate) return false;
              if (filter === "active") return r.status === "active";
              if (filter === "completed") return r.status === "completed" && !r.payment_pending;
              if (filter === "pending") return r.payment_pending;
              return true;
            });
            return loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay alquileres con este filtro</p>
            ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary/50 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{r.client_name}</p>
                      <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-xs">
                        {r.status === "active" ? "Activo" : "Completado"}
                      </Badge>
                      {r.payment_pending && (
                        <Badge variant="destructive" className="text-xs">Pago Pendiente</Badge>
                      )}
                      {r.payment_prepaid && (
                        <Badge variant="secondary" className="text-xs">Pagado (Adelantado)</Badge>
                      )}
                      {r.payment_method && !r.payment_pending && !r.payment_prepaid && (
                        <Badge variant="outline" className="text-xs">{r.payment_method}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.zone} {r.service_type && `• ${r.service_type}`} • {r.address} {r.floor_number && `• Piso ${r.floor_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.delivered_by && `Entregó: ${r.delivered_by}`}{r.picked_up_by && ` • Retiró: ${r.picked_up_by}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.entry_time && `Entrada: ${r.entry_time}`}{r.exit_time && ` • Salida: ${r.exit_time}`} • {new Date(r.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.total > 0 && <span className="font-semibold text-sm">{formatCOP(r.total)}</span>}
                    {r.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => openCompleteDialog(r)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Completar
                      </Button>
                    )}
                    {r.payment_pending && (
                      <Button size="sm" variant="default" onClick={() => openCollectDialog(r)}>
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> Cobrar
                      </Button>
                    )}
                    {role === "admin" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar alquiler?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará permanentemente el alquiler de "{r.client_name}". Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                              try {
                                await deleteRental(r.id);
                                toast({ title: "Alquiler eliminado ✓" });
                              } catch (err: any) {
                                toast({ title: err.message || "Error al eliminar", variant: "destructive" });
                              }
                            }}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </CardContent>
      </Card>
      {/* Collect pending payment dialog */}
      <Dialog open={!!collectingRental} onOpenChange={(open) => { if (!open) setCollectingRental(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cobrar Pago Pendiente</DialogTitle></DialogHeader>
          {collectingRental && (
            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">{collectingRental.client_name}</span></p>
                <p>{collectingRental.zone} • {collectingRental.service_type}</p>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-border pt-3">
                <span>Total a cobrar</span>
                <span className="text-primary">{formatCOP(collectingRental.total)}</span>
              </div>

              <div className="space-y-3 rounded-lg border border-border p-3">
                <Label className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Método de Pago</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="collectSplit"
                    checked={collectPaymentSplit}
                    onCheckedChange={(v) => {
                      setCollectPaymentSplit(!!v);
                      if (v) setCollectPaymentMethod("");
                    }}
                  />
                  <label htmlFor="collectSplit" className="text-sm text-muted-foreground cursor-pointer">Pago dividido</label>
                </div>
                {collectPaymentSplit ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Efectivo</Label>
                      <Input type="number" min={0} value={collectCashAmount} onChange={(e) => setCollectCashAmount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Transferencia</Label>
                      <Input type="number" min={0} value={collectTransferAmount} onChange={(e) => setCollectTransferAmount(Number(e.target.value))} />
                    </div>
                    {(collectCashAmount + collectTransferAmount) !== collectingRental.total && (
                      <p className="col-span-2 text-xs text-destructive">
                        Suma: {formatCOP(collectCashAmount + collectTransferAmount)} — debe ser {formatCOP(collectingRental.total)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Select value={collectPaymentMethod} onValueChange={setCollectPaymentMethod}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={collectPayment}>
                  <Check className="h-4 w-4 mr-1" /> Cobrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
