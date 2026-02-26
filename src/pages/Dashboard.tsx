import { useState, useEffect } from "react";
import {
  WashingMachine,
  Warehouse,
  Wrench,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCOP } from "@/lib/data";
import { fetchRentals, fetchTodayCashEntries } from "@/lib/supabase-data";

export default function Dashboard() {
  const [activeRentals, setActiveRentals] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [rentals, entries] = await Promise.all([fetchRentals(), fetchTodayCashEntries()]);
      setActiveRentals(rentals.filter((r) => r.status === "active"));
      setRecentEntries(entries.slice(0, 5));
      const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      setSummary({ income, expense, balance: income - expense });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Active rentals & recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="section-title flex items-center gap-2">
              <WashingMachine className="h-5 w-5 text-primary" />
              Alquileres Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeRentals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay alquileres activos</p>
            ) : (
              <div className="space-y-3">
                {activeRentals.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{r.client_name}</p>
                      <p className="text-xs text-muted-foreground">{r.zone} • {r.service_type}</p>
                    </div>
                    <span className="font-semibold text-sm">{formatCOP(r.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
