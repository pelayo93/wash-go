import { useState, useEffect, useCallback } from "react";
import {
  WashingMachine,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  CreditCard,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import { formatCOP } from "@/lib/data";
import { fetchRentals, fetchTodayCashEntries, updateRentalStatus, insertCashEntry, fetchPaymentMethods } from "@/lib/supabase-data";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeRentals, setActiveRentals] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Collect payment state
  const [collectingRental, setCollectingRental] = useState<any | null>(null);
  const [collectPaymentMethod, setCollectPaymentMethod] = useState("");
  const [collectPaymentSplit, setCollectPaymentSplit] = useState(false);
  const [collectCashAmount, setCollectCashAmount] = useState(0);
  const [collectTransferAmount, setCollectTransferAmount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [rentals, entries, pm] = await Promise.all([fetchRentals(), fetchTodayCashEntries(), fetchPaymentMethods()]);
      setActiveRentals(rentals.filter((r) => r.status === "active"));
      setPendingPayments(rentals.filter((r) => r.payment_pending));
      setRecentEntries(entries.slice(0, 5));
      setPaymentMethods(pm);
      const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      setSummary({ income, expense, balance: income - expense });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const pendingTotal = pendingPayments.reduce((s, r) => s + r.total, 0);

  const openCollectDialog = (rental: any) => {
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
      loadData();
      toast({ title: "Pago cobrado ✓" });
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-muted-foreground text-sm capitalize">{today}</p>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entradas Hoy</p>
              <p className="stat-value text-success">{formatCOP(summary.income)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salidas Hoy</p>
              <p className="stat-value text-destructive">{formatCOP(summary.expense)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-accent">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm opacity-80">Saldo Neto</p>
              <p className="stat-value">{formatCOP(summary.balance)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
              <p className="stat-value text-warning">{pendingPayments.length} ({formatCOP(pendingTotal)})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active rentals, pending payments & recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="section-title flex items-center gap-2">
              <WashingMachine className="h-5 w-5 text-primary" />
              Alquileres Activos ({activeRentals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeRentals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay alquileres activos</p>
            ) : (
              <div className="space-y-3">
                {activeRentals.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{r.client_name}</p>
                      <p className="text-xs text-muted-foreground">{r.zone} • {r.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.delivered_by && `Entregó: ${r.delivered_by}`}
                        {r.entry_time && ` • ${r.entry_time}`}
                      </p>
                    </div>
                    <Badge variant="default" className="text-xs">Activo</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="section-title flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Pagos Pendientes ({pendingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay pagos pendientes</p>
            ) : (
              <div className="space-y-3">
                {pendingPayments.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{r.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.zone} • {r.service_type} • {r.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-warning">{formatCOP(r.total)}</span>
                      <Button size="sm" variant="default" onClick={() => openCollectDialog(r)}>
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> Cobrar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Movimientos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin movimientos hoy</p>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    {e.type === "income" ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{e.description || (e.type === "income" ? "Pago cliente" : "Gasto")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${e.type === "income" ? "text-success" : "text-destructive"}`}>
                    {e.type === "income" ? "+" : "-"}{formatCOP(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
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
                    id="dashCollectSplit"
                    checked={collectPaymentSplit}
                    onCheckedChange={(v) => {
                      setCollectPaymentSplit(!!v);
                      if (v) setCollectPaymentMethod("");
                    }}
                  />
                  <label htmlFor="dashCollectSplit" className="text-sm text-muted-foreground cursor-pointer">Pago dividido</label>
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
