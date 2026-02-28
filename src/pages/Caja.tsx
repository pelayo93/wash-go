import { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight, ArrowDownRight, Plus, Lock, TrendingUp, TrendingDown,
  Pencil, Trash2, Check, X, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCOP } from "@/lib/data";
import {
  fetchTodayCashEntries, insertCashEntry, updateCashEntry, deleteCashEntry,
  isTodayClosed, insertDailyClose, insertCashAuditLog, fetchCashAuditLog,
} from "@/lib/supabase-data";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Caja() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  // Form
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [todayEntries, todayClosed] = await Promise.all([fetchTodayCashEntries(), isTodayClosed()]);
      setEntries(todayEntries);
      setClosed(todayClosed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const loadAudit = async () => {
    try { setAuditLog(await fetchCashAuditLog()); } catch (err) { console.error(err); }
  };

  const summary = {
    income: entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0),
    expense: entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0),
    get balance() { return this.income - this.expense; },
  };

  const logAudit = async (action: string, cashEntryId?: string, details: Record<string, any> = {}) => {
    try {
      await insertCashAuditLog({ action, cash_entry_id: cashEntryId, details, performed_by: user!.id });
    } catch (err) { console.error("Audit log error:", err); }
  };

  const handleAdd = async () => {
    if (closed) { toast({ title: "La caja de hoy ya fue cerrada", variant: "destructive" }); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast({ title: "Ingresa un monto válido", variant: "destructive" }); return; }
    try {
      await insertCashEntry({
        type, amount: amt,
        description: description || (type === "income" ? "Pago cliente" : "Gasto"),
        created_by: user!.id,
      });
      await logAudit("create", undefined, { type, amount: amt, description: description || (type === "income" ? "Pago cliente" : "Gasto") });
      await refresh();
      setAmount(""); setDescription("");
      toast({ title: type === "income" ? "Entrada registrada ✓" : "Salida registrada ✓" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string, entry: any) => {
    try {
      await deleteCashEntry(id);
      await logAudit("delete", id, { type: entry.type, amount: entry.amount, description: entry.description });
      await refresh();
      toast({ title: "Movimiento eliminado" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id); setEditAmount(entry.amount.toString()); setEditDescription(entry.description);
  };

  const cancelEdit = () => { setEditingId(null); setEditAmount(""); setEditDescription(""); };

  const saveEdit = async (id: string, oldEntry: any) => {
    const amt = Number(editAmount);
    if (!amt || amt <= 0) { toast({ title: "Monto inválido", variant: "destructive" }); return; }
    try {
      await updateCashEntry(id, { amount: amt, description: editDescription });
      await logAudit("update", id, {
        old: { amount: oldEntry.amount, description: oldEntry.description },
        new: { amount: amt, description: editDescription },
      });
      await refresh();
      cancelEdit();
      toast({ title: "Movimiento actualizado ✓" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  };

  const handleClose = async () => {
    if (closed) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      await insertDailyClose({
        date: today, total_income: summary.income,
        total_expense: summary.expense, balance: summary.balance, closed_by: user!.id,
      });
      await logAudit("daily_close", undefined, { date: today, income: summary.income, expense: summary.expense, balance: summary.balance });
      await refresh();
      toast({ title: "Cierre de caja realizado ✓", description: "El resumen quedó guardado en Reportes." });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caja Diaria</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAudit} onOpenChange={(v) => { setShowAudit(v); if (v) loadAudit(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><ClipboardList className="h-4 w-4 mr-1" /> Auditoría</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Historial de Auditoría - Caja</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin registros</p>
                ) : auditLog.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {log.action === "create" && "✚ Creación"}
                        {log.action === "update" && "✎ Edición"}
                        {log.action === "delete" && "✕ Eliminación"}
                        {log.action === "daily_close" && "🔒 Cierre"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.action === "create" && `${log.details.type === "income" ? "Entrada" : "Salida"}: ${formatCOP(log.details.amount)} - ${log.details.description}`}
                      {log.action === "update" && `De ${formatCOP(log.details.old?.amount)} → ${formatCOP(log.details.new?.amount)}`}
                      {log.action === "delete" && `${log.details.type === "income" ? "Entrada" : "Salida"}: ${formatCOP(log.details.amount)} - ${log.details.description}`}
                      {log.action === "daily_close" && `Balance: ${formatCOP(log.details.balance)}`}
                    </div>
                  </div>
                ))}
              </div>
              <DialogClose asChild><Button variant="outline" className="w-full">Cerrar</Button></DialogClose>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Lock className="h-4 w-4 mr-1" /> Cierre de Caja</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cierre de Caja - Hoy</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
                  <span className="text-sm font-medium">Total Entradas</span>
                  <span className="font-bold text-success">{formatCOP(summary.income)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                  <span className="text-sm font-medium">Total Salidas</span>
                  <span className="font-bold text-destructive">{formatCOP(summary.expense)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-lg bg-primary text-primary-foreground">
                  <span className="font-medium">Saldo Neto</span>
                  <span className="text-xl font-bold">{formatCOP(summary.balance)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">{entries.length} movimientos registrados hoy</p>
                {closed ? (
                  <p className="text-center text-sm font-medium text-success">✓ Caja cerrada hoy</p>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" variant="destructive" disabled={entries.length === 0}>
                        <Lock className="h-4 w-4 mr-1" /> Confirmar Cierre de Caja
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cerrar la caja de hoy?</AlertDialogTitle>
                        <AlertDialogDescription>Se guardará el resumen del día en reportes. No podrás agregar, editar ni eliminar movimientos de hoy después del cierre.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClose}>Sí, cerrar caja</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <DialogClose asChild><Button variant="outline" className="w-full">Cerrar</Button></DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {closed && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
          <p className="text-sm font-medium text-success">✓ La caja de hoy ya fue cerrada</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <ArrowUpRight className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="font-bold text-success text-lg">{formatCOP(summary.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <ArrowDownRight className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Salidas</p>
            <p className="font-bold text-destructive text-lg">{formatCOP(summary.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="font-bold text-primary text-lg">{formatCOP(summary.balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add entry */}
      {!closed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="section-title flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Registrar Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={type === "income" ? "default" : "outline"} onClick={() => setType("income")} className="w-full">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Entrada
              </Button>
              <Button variant={type === "expense" ? "destructive" : "outline"} onClick={() => setType("expense")} className="w-full">
                <ArrowDownRight className="h-4 w-4 mr-1" /> Salida
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} />
              </div>
              <div className="space-y-2">
                <Label>Nota / Descripción (opcional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del movimiento" rows={2} />
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full sm:w-auto">
              Registrar {type === "income" ? "Entrada" : "Salida"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title">Movimientos de Hoy ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin movimientos</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 gap-2">
                  {editingId === e.id ? (
                    <>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <Input type="number" value={editAmount} onChange={(ev) => setEditAmount(ev.target.value)} className="w-28" min={0} />
                        <Input value={editDescription} onChange={(ev) => setEditDescription(ev.target.value)} placeholder="Descripción" className="flex-1" />
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => saveEdit(e.id, e)}>
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {e.type === "income" ? <TrendingUp className="h-4 w-4 text-success shrink-0" /> : <TrendingDown className="h-4 w-4 text-destructive shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{e.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(e.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-semibold text-sm ${e.type === "income" ? "text-success" : "text-destructive"}`}>
                          {e.type === "income" ? "+" : "-"}{formatCOP(e.amount)}
                        </span>
                        {!closed && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminará "{e.description}" por {formatCOP(e.amount)}. Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(e.id, e)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
