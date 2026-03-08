import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, MapPin, DollarSign, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCOP } from "@/lib/data";
import {
  fetchZones, insertZone, updateZone, deleteZone,
  fetchZonePrices, upsertZonePrice, deleteZonePrice,
  fetchAppSettings, updateAppSetting,
} from "@/lib/supabase-data";
import { useToast } from "@/hooks/use-toast";

export default function Servicios() {
  const { toast } = useToast();
  const [zones, setZones] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Surcharges
  const [extraHora, setExtraHora] = useState(3000);
  const [piso34, setPiso34] = useState(1000);
  const [piso56, setPiso56] = useState(2000);
  const [editingSurcharges, setEditingSurcharges] = useState(false);
  const [editExtraHora, setEditExtraHora] = useState("");
  const [editPiso34, setEditPiso34] = useState("");
  const [editPiso56, setEditPiso56] = useState("");

  // New zone
  const [newZoneName, setNewZoneName] = useState("");

  // Edit zone name
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [editZoneName, setEditZoneName] = useState("");

  // Add/edit service price
  const [priceDialogZone, setPriceDialogZone] = useState<any | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  const load = useCallback(async () => {
    try {
      const [z, p] = await Promise.all([fetchZones(), fetchZonePrices()]);
      setZones(z);
      setPrices(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;
    try {
      await insertZone(newZoneName.trim());
      setNewZoneName("");
      await load();
      toast({ title: "Zona creada ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  const handleUpdateZoneName = async () => {
    if (!editingZone || !editZoneName.trim()) return;
    try {
      await updateZone(editingZone.id, { name: editZoneName.trim() });
      setEditingZone(null);
      await load();
      toast({ title: "Zona actualizada ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  const handleDeleteZone = async (id: string) => {
    try {
      await deleteZone(id);
      await load();
      toast({ title: "Zona eliminada ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  const handleAddService = async () => {
    if (!priceDialogZone || !serviceName.trim() || !servicePrice) return;
    try {
      await upsertZonePrice(priceDialogZone.id, serviceName.trim(), Number(servicePrice));
      setServiceName("");
      setServicePrice("");
      await load();
      toast({ title: "Servicio guardado ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    try {
      await deleteZonePrice(priceId);
      await load();
      toast({ title: "Servicio eliminado ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  const zonePrices = (zoneId: string) => prices.filter((p) => p.zone_id === zoneId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Servicios y Zonas</h1>
        <p className="text-sm text-muted-foreground">Gestiona zonas, servicios y precios</p>
      </div>

      {/* Global surcharges info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Recargos Globales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-muted-foreground">Hora Extra</p>
              <p className="font-semibold">{formatCOP(EXTRA_HORA)}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-muted-foreground">Piso 3°-4°</p>
              <p className="font-semibold">+{formatCOP(PISO_EXTRA["3-4"])}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-muted-foreground">Piso 5°-6°</p>
              <p className="font-semibold">+{formatCOP(PISO_EXTRA["5-6"])}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add new zone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Agregar Nueva Zona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="Nombre de la zona"
              onKeyDown={(e) => e.key === "Enter" && handleAddZone()}
            />
            <Button onClick={handleAddZone} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Zone list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {zone.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditingZone(zone); setEditZoneName(zone.name); }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setPriceDialogZone(zone); setServiceName(""); setServicePrice(""); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se desactivará la zona "{zone.name}" y todos sus servicios.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteZone(zone.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {zonePrices(zone.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin servicios configurados</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {zonePrices(zone.id).map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5">
                        <span className="text-sm font-medium">{p.service_name}</span>
                        <span className="text-sm text-muted-foreground">-</span>
                        <span className="text-sm font-semibold text-primary">{formatCOP(p.price)}</span>
                        <button onClick={() => {
                          setPriceDialogZone(zone);
                          setServiceName(p.service_name);
                          setServicePrice(String(p.price));
                        }} className="ml-1 text-muted-foreground hover:text-foreground">
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDeletePrice(p.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit zone name dialog */}
      <Dialog open={!!editingZone} onOpenChange={(open) => { if (!open) setEditingZone(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Zona</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la Zona</Label>
              <Input value={editZoneName} onChange={(e) => setEditZoneName(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleUpdateZoneName}>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/edit service price dialog */}
      <Dialog open={!!priceDialogZone} onOpenChange={(open) => { if (!open) setPriceDialogZone(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {serviceName ? "Editar" : "Agregar"} Servicio - {priceDialogZone?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre del Servicio</Label>
              <Input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Ej: 24h, Día, Promo"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio (COP)</Label>
              <Input
                type="number" min={0}
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                placeholder="Ej: 32000"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleAddService}>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
