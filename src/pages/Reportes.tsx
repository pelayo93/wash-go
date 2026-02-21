import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCashEntries, formatCOP } from "@/lib/data";

export default function Reportes() {
  const allEntries = getCashEntries();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const filtered = useMemo(() => {
    return allEntries.filter((e) => {
      const date = e.createdAt.split("T")[0];
      return date >= startDate && date <= endDate;
    });
  }, [allEntries, startDate, endDate]);

  const totalIncome = filtered.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = filtered.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  // Group by date
  const byDate = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {};
    filtered.forEach((e) => {
      const date = e.createdAt.split("T")[0];
      if (!map[date]) map[date] = { income: 0, expense: 0, count: 0 };
      map[date].count++;
      if (e.type === "income") map[date].income += e.amount;
      else map[date].expense += e.amount;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">Historial financiero por rango de fechas</p>
      </div>

      {/* Date filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Desde</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Hasta</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-success">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ingresos</p>
              <p className="stat-value text-success">{formatCOP(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-warning">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Egresos</p>
              <p className="stat-value text-destructive">{formatCOP(totalExpense)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-highlight">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="stat-value">{formatCOP(totalIncome - totalExpense)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Desglose Diario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byDate.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay datos en este rango
            </p>
          ) : (
            <div className="space-y-2">
              {byDate.map(([date, data]) => (
                <div key={date} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary/50 gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(date + "T12:00:00").toLocaleDateString("es-CO", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">{data.count} movimientos</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-success font-medium">+{formatCOP(data.income)}</span>
                    <span className="text-destructive font-medium">-{formatCOP(data.expense)}</span>
                    <span className="font-bold">{formatCOP(data.income - data.expense)}</span>
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
