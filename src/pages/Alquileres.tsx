import { useState, useEffect, useCallback } from "react";
import {
  WashingMachine, Plus, Phone, MapPin, User, Check, Clock, UserCheck, CreditCard,
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
import { formatCOP } from "@/lib/data";
import { useZones } from "@/hooks/useZones";
import { useSurcharges } from "@/hooks/useSurcharges";
import { fetchRentals, insertRental, updateRentalStatus, insertCashEntry, fetchDeliveryPeople, fetchPaymentMethods } from "@/lib/supabase-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DeliveryPeopleManager from "@/components/DeliveryPeopleManager";

export default function Alquileres() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [rentals, setRentals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deliveryPeople, setDeliveryPeople] = useState<any[]>([]);
  const { zones: ZONES, reload: reloadZones } = useZones();
  const { surcharges } = useSurcharges();

  // Complete dialog state
  const [completingRental, setCompletingRental] = useState<any | null>(null);
  const [completePickedUpBy, setCompletePickedUpBy] = useState("");
  const [completeExitTime, setCompleteExitTime] = useState("");
  const [completeZone, setCompleteZone] = useState("");
  const [completeServiceType, setCompleteServiceType] = useState("");
  const [completeExtraHours, setCompleteExtraHours] = useState(0);
  const [completeFloor, setCompleteFloor] = useState("1-2");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [completePaymentMethod, setCompletePaymentMethod] = useState("");
  const [completePaymentSplit, setCompletePaymentSplit] = useState(false);
  const [completeCashAmount, setCompleteCashAmount] = useState(0);
  const [completeTransferAmount, setCompleteTransferAmount] = useState(0);
  const [completePaymentPending, setCompletePaymentPending] = useState(false);

  // Form state (simplified - no pricing fields)
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [entryTime, setEntryTime] = useState("");

  // Complete dialog pricing
  const completeZoneObj = ZONES.find((z) => z.name === completeZone);
  const completeServiceTypes = completeZoneObj ? Object.keys(completeZoneObj.prices) : [];
  const completeBasePrice = completeZoneObj && completeServiceType ? completeZoneObj.prices[completeServiceType] || 0 : 0;
  const completeFloorSurcharge = completeFloor === "3-4" ? surcharges.piso34 : completeFloor === "5-6" ? surcharges.piso56 : 0;
  const completeTotal = completeBasePrice + completeExtraHours * surcharges.extraHora + completeFloorSurcharge;

  const loadDeliveryPeople = useCallback(async () => {
    try {
      const [dp, pm] = await Promise.all([fetchDeliveryPeople(), fetchPaymentMethods()]);
      setDeliveryPeople(dp);
      setPaymentMethods(pm);
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
    setShowForm(false);
  };

  const openCompleteDialog = (rental: any) => {
    setCompletingRental(rental);
    setCompleteZone(rental.zone || "");
    setCompleteServiceType("");
    setCompleteExtraHours(0);
    setCompleteFloor("1-2");
    setCompletePickedUpBy("");
    setCompleteExitTime("");
    setCompletePaymentMethod("");
    setCompletePaymentSplit(false);
    setCompleteCashAmount(0);
    setCompleteTransferAmount(0);
    setCompletePaymentPending(false);
  };

  const closeCompleteDialog = () => {
    setCompletingRental(null);
    setCompletePickedUpBy("");
    setCompleteExitTime("");
    setCompleteZone("");
    setCompleteServiceType("");
    setCompleteExtraHours(0);
    setCompleteFloor("1-2");
    setCompletePaymentMethod("");
    setCompletePaymentSplit(false);
    setCompleteCashAmount(0);
    setCompleteTransferAmount(0);
    setCompletePaymentPending(false);
  };

  const handleSubmit = async () => {
    if (!clientName || !phone || !address || !selectedZone) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
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
    if (!completingRental || !completeServiceType) {
      toast({ title: "Selecciona el tipo de servicio", variant: "destructive" });
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
      await updateRentalStatus(completingRental.id, "completed", {
        pickedUpBy: completePickedUpBy,
        exitTime: completeExitTime,
        serviceType: completeServiceType,
        price: completeBasePrice,
        extraHours: completeExtraHours,
        floorSurcharge: completeFloorSurcharge,
        total: completeTotal,
        floor: completeFloor,
        paymentMethod: isPending ? "Pago pendiente" : completePaymentSplit ? "Dividido" : completePaymentMethod,
        paymentSplit: completePaymentSplit,
        paymentCashAmount: completePaymentSplit ? completeCashAmount : 0,
        paymentTransferAmount: completePaymentSplit ? completeTransferAmount : 0,
        paymentPending: isPending,
      });
      if (!isPending) {
        await insertCashEntry({
          type: "income", amount: completeTotal,
          description: `Alquiler ${completeServiceType} - ${completingRental.client_name} (${completeZone})${completePaymentSplit ? " [Dividido]" : ` [${completePaymentMethod}]`}`,
          category: "alquiler", created_by: user!.id,
        });
      }
      closeCompleteDialog();
      toast({ title: isPending ? "Alquiler completado (pago pendiente) ✓" : "Alquiler completado ✓" });
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Cliente</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Teléfono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Dirección</Label>
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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-1" /> Registrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete rental dialog */}
      <Dialog open={!!completingRental} onOpenChange={(open) => { if (!open) closeCompleteDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Completar Alquiler</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {completingRental && (
              <p className="text-sm text-muted-foreground">
                Cliente: <span className="font-medium text-foreground">{completingRental.client_name}</span> • {completingRental.zone}
              </p>
            )}
            <div className="space-y-2">
              <Label>Tipo de Servicio</Label>
              <Select value={completeServiceType} onValueChange={setCompleteServiceType}>
                <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                <SelectContent>
                  {completeServiceTypes.map((st) => (
                    <SelectItem key={st} value={st}>{st} - {formatCOP(completeZoneObj!.prices[st])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horas Extras ({formatCOP(surcharges.extraHora)}/h)</Label>
              <Input type="number" min={0} value={completeExtraHours} onChange={(e) => setCompleteExtraHours(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Piso</Label>
              <Select value={completeFloor} onValueChange={setCompleteFloor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2">1° - 2° (sin recargo)</SelectItem>
                  <SelectItem value="3-4">3° - 4° (+{formatCOP(surcharges.piso34)})</SelectItem>
                  <SelectItem value="5-6">5° - 6° (+{formatCOP(surcharges.piso56)})</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

            {/* Payment method */}
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

            {completeBasePrice > 0 && (
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
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatCOP(completeTotal)}</span>
                </div>
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
          <CardTitle className="section-title flex items-center gap-2">
            <WashingMachine className="h-5 w-5 text-primary" />
            Historial de Alquileres
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : rentals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay alquileres registrados</p>
          ) : (
            <div className="space-y-3">
              {rentals.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary/50 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{r.client_name}</p>
                      <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-xs">
                        {r.status === "active" ? "Activo" : "Completado"}
                      </Badge>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
