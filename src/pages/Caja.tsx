import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Lock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCashEntries,
  saveCashEntry,
  getTodaySummary,
  formatCOP,
  generateId,
  type CashEntry,
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const EXPENSE_CATEGORIES = ["Gasolina", "Repuestos", "Comida", "Transporte", "Otros"];

export default function Caja() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<CashEntry[]>(getCashEntries());
  const [summary, setSummary] = useState(getTodaySummary());

  // Form
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const refresh = () => {
    setEntries(getCashEntries());
    setSummary(getTodaySummary());
  };

  const handleAdd = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Ingresa un monto válido", variant: "destructive" });
      return;
    }
    saveCashEntry({
      id: generateId(),
      type,
      amount: amt,
      description: description || (type === "income" ? "Pago cliente" : category || "Gasto"),
      category: type === "expense" ? category : undefined,
      createdAt: new Date().toISOString(),
    });
    refresh();
    setAmount("");
    setDescription("");
    setCategory("");
    toast({ title: type === "income" ? "Entrada registrada ✓" : "Salida registrada ✓" });
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntries = entries.filter((e) => e.createdAt.startsWith(todayStr));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caja Diaria</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Lock className="h-4 w-4 mr-1" /> Cierre de Caja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cierre de Caja - Hoy</DialogTitle>
            </DialogHeader>
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
              <p className="text-xs text-muted-foreground text-center">
                {todayEntries.length} movimientos registrados hoy
              </p>
            </div>
            <DialogClose asChild>
              <Button className="w-full">Cerrar</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>

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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Registrar Movimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className="w-full"
            >
              <ArrowUpRight className="h-4 w-4 mr-1" /> Entrada
            </Button>
            <Button
              variant={type === "expense" ? "destructive" : "outline"}
              onClick={() => setType("expense")}
              className="w-full"
            >
              <ArrowDownRight className="h-4 w-4 mr-1" /> Salida
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} />
            </div>
            {type === "expense" && (
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className={`space-y-2 ${type === "income" ? "sm:col-span-1" : "sm:col-span-2"}`}>
              <Label>Nota / Descripción (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del movimiento" rows={2} />
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            Registrar {type === "income" ? "Entrada" : "Salida"}
          </Button>
        </CardContent>
      </Card>

      {/* Today's entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title">Movimientos de Hoy ({todayEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin movimientos</p>
          ) : (
            <div className="space-y-2">
              {todayEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    {e.type === "income" ? (
                      <TrendingUp className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        {e.category && ` • ${e.category}`}
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
    </div>
  );
}
