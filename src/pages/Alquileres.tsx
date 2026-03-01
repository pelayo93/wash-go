import { useState, useEffect, useCallback } from "react";
import {
  WashingMachine, Plus, Phone, MapPin, User, Check, X, Clock, UserCheck,
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
import { ZONES, EXTRA_HORA, PISO_EXTRA, formatCOP } from "@/lib/data";
import { fetchRentals, insertRental, updateRentalStatus, insertCashEntry, fetchDeliveryPeople } from "@/lib/supabase-data";
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

  // Complete dialog state
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completePickedUpBy, setCompletePickedUpBy] = useState("");

  // Form state
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [extraHours, setExtraHours] = useState(0);
  const [floor, setFloor] = useState("1-2");
  const [floorNumber, setFloorNumber] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");

  const zone = ZONES.find((z) => z.name === selectedZone);
  const serviceTypes = zone ? Object.keys(zone.prices) : [];
  const basePrice = zone && serviceType ? zone.prices[serviceType] || 0 : 0;
  const floorSurcharge = floor === "3-4" ? PISO_EXTRA["3-4"] : floor === "5-6" ? PISO_EXTRA["5-6"] : 0;
  const total = basePrice + extraHours * EXTRA_HORA + floorSurcharge;

  const loadDeliveryPeople = useCallback(async () => {
    try { setDeliveryPeople(await fetchDeliveryPeople()); } catch (err) { console.error(err); }
  }, []);

  const loadRentals = useCallback(async () => {
    try { setRentals(await fetchRentals()); } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRentals(); loadDeliveryPeople(); }, [loadRentals, loadDeliveryPeople]);

  // Realtime subscription
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
    setSelectedZone(""); setServiceType("");
    setExtraHours(0); setFloor("1-2"); setFloorNumber("");
    setDeliveredBy("");
    setEntryTime(""); setExitTime("");
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!clientName || !phone || !address || !selectedZone || !serviceType) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }
    try {
      await insertRental({
        client_name: clientName, phone, address,
        zone: selectedZone, service_type: serviceType,
        price: basePrice, extra_hours: extraHours,
        floor_surcharge: floorSurcharge, total,
        floor_number: floorNumber, delivered_by: deliveredBy,
        picked_up_by: "", entry_time: entryTime,
        exit_time: exitTime, created_by: user!.id,
      });
      await insertCashEntry({
        type: "income", amount: total,
        description: `Alquiler ${serviceType} - ${clientName} (${selectedZone})`,
        category: "alquiler", created_by: user!.id,
      });
      resetForm();
      toast({ title: "Alquiler registrado ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error al registrar", variant: "destructive" });
    }
  };

  const completeRental = async () => {
    if (!completingId) return;
    try {
      await updateRentalStatus(completingId, "completed", completePickedUpBy);
      setCompletingId(null);
      setCompletePickedUpBy("");
      toast({ title: "Alquiler completado ✓" });
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
            <Plus className="h-4 w-4 mr-1" /> Nuevo Servicio
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="card-highlight">
          <CardHeader className="pb-3">
            <CardTitle className="section-title">Registrar Servicio</CardTitle>
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
                <Select value={selectedZone} onValueChange={(v) => { setSelectedZone(v); setServiceType(""); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar zona" /></SelectTrigger>
                  <SelectContent>
                    {ZONES.map((z) => (<SelectItem key={z.name} value={z.name}>{z.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Servicio</Label>
                <Select value={serviceType} onValueChange={setServiceType} disabled={!selectedZone}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((st) => (<SelectItem key={st} value={st}>{st} - {formatCOP(zone!.prices[st])}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horas Extras ({formatCOP(EXTRA_HORA)}/h)</Label>
                <Input type="number" min={0} value={extraHours} onChange={(e) => setExtraHours(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Piso</Label>
                <Select value={floor} onValueChange={setFloor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2">1° - 2° (sin recargo)</SelectItem>
                    <SelectItem value="3-4">3° - 4° (+{formatCOP(PISO_EXTRA["3-4"])})</SelectItem>
                    <SelectItem value="5-6">5° - 6° (+{formatCOP(PISO_EXTRA["5-6"])})</SelectItem>
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Hora de Salida</Label>
                <Input type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)} />
              </div>
            </div>

            {basePrice > 0 && (
              <div className="rounded-lg bg-secondary p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base ({serviceType})</span>
                  <span>{formatCOP(basePrice)}</span>
                </div>
                {extraHours > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{extraHours} hora(s) extra</span>
                    <span>{formatCOP(extraHours * EXTRA_HORA)}</span>
                  </div>
                )}
                {floorSurcharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recargo piso</span>
                    <span>{formatCOP(floorSurcharge)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatCOP(total)}</span>
                </div>
              </div>
            )}

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
      <Dialog open={!!completingId} onOpenChange={(open) => { if (!open) { setCompletingId(null); setCompletePickedUpBy(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Completar Alquiler</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
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
                      {r.zone} • {r.service_type} • {r.address} {r.floor_number && `• Piso ${r.floor_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.delivered_by && `Entregó: ${r.delivered_by}`}{r.picked_up_by && ` • Retiró: ${r.picked_up_by}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.entry_time && `Entrada: ${r.entry_time}`}{r.exit_time && ` • Salida: ${r.exit_time}`} • {new Date(r.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{formatCOP(r.total)}</span>
                    {r.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => setCompletingId(r.id)}>
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
