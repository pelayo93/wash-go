import { useState, useEffect, useMemo, useCallback } from "react";
import type { CashEntry, DailyClose, Rental } from "@/types";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, FileText, MapPin, UserCheck, Eye, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCOP } from "@/lib/data";
import { fetchCashEntries, fetchDailyCloses, fetchRentals } from "@/lib/supabase-data";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

export default function Reportes() {
  const [allEntries, setAllEntries] = useState<CashEntry[]>([]);
  const [dailyCloses, setDailyCloses] = useState<DailyClose[]>([]);
  const [allRentals, setAllRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Convert any date/ISO to a YYYY-MM-DD string in Colombia timezone (UTC-5)
  const toBogotaDate = (input: string | Date) => {
    const d = typeof input === "string" ? new Date(input) : input;
    // en-CA produces YYYY-MM-DD format
    return d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  };
  const getLocalDate = () => toBogotaDate(new Date());
  const [startDate, setStartDate] = useState(getLocalDate);
  const [endDate, setEndDate] = useState(getLocalDate);

  useEffect(() => {
    async function load() {
      try {
        const [entries, closes, rentals] = await Promise.all([
          fetchCashEntries(), fetchDailyCloses(), fetchRentals(),
        ]);
        setAllEntries(entries);
        setDailyCloses(closes);
        setAllRentals(rentals);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Financial by date
  const byDate = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number; closed: boolean }> = {};
    dailyCloses.forEach((c) => {
      if (c.date >= startDate && c.date <= endDate)
        map[c.date] = { income: c.total_income, expense: c.total_expense, count: 0, closed: true };
    });
    allEntries.forEach((e) => {
      const date = toBogotaDate(e.created_at);
      if (date >= startDate && date <= endDate && !map[date]?.closed) {
        if (!map[date]) map[date] = { income: 0, expense: 0, count: 0, closed: false };
        map[date].count++;
        if (e.type === "income") map[date].income += e.amount;
        else map[date].expense += e.amount;
      }
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [allEntries, dailyCloses, startDate, endDate]);

  const totalIncome = byDate.reduce((s, [, d]) => s + d.income, 0);
  const totalExpense = byDate.reduce((s, [, d]) => s + d.expense, 0);

  // Rentals in range (use Bogota local date based on completion when available)
  const filteredRentals = useMemo(() =>
    allRentals.filter((r) => {
      const ref = r.completed_at || r.created_at;
      const d = toBogotaDate(ref);
      return d >= startDate && d <= endDate;
    }), [allRentals, startDate, endDate]);

  // By zone with service breakdown
  const byZone = useMemo(() => {
    const map: Record<string, { count: number; total: number; services: Record<string, { count: number; total: number }> }> = {};
    filteredRentals.forEach((r) => {
      if (!map[r.zone]) map[r.zone] = { count: 0, total: 0, services: {} };
      map[r.zone].count++;
      map[r.zone].total += r.total;
      const svc = r.service_type || "Sin servicio";
      if (!map[r.zone].services[svc]) map[r.zone].services[svc] = { count: 0, total: 0 };
      map[r.zone].services[svc].count++;
      map[r.zone].services[svc].total += r.total;
    });
    return Object.entries(map).sort(([, a], [, b]) => b.total - a.total);
  }, [filteredRentals]);

  // Services breakdown per zone
  const zoneServices = useMemo(() => {
    const map: Record<string, { service_type: string; total: number; client_name: string; date: string; delivered_by: string; status: string }[]> = {};
    filteredRentals.forEach((r) => {
      if (!map[r.zone]) map[r.zone] = [];
      map[r.zone].push({
        service_type: r.service_type || "-",
        total: r.total,
        client_name: r.client_name,
        date: new Date(r.created_at).toLocaleDateString("es-CO"),
        delivered_by: r.delivered_by || "-",
        status: r.status,
      });
    });
    return map;
  }, [filteredRentals]);

  const zoneRentals = useMemo(() => {
    if (!selectedZone) return [];
    return filteredRentals.filter((r) => r.zone === selectedZone);
  }, [filteredRentals, selectedZone]);

  const zoneSummary = useMemo(() => {
    if (!selectedZone) return { count: 0, total: 0 };
    const data = byZone.find(([name]) => name === selectedZone);
    return data ? data[1] : { count: 0, total: 0 };
  }, [byZone, selectedZone]);

  // By delivery person
   const byPerson = useMemo(() => {
    const map: Record<string, { deliveries: number; pickups: number; totalDeliveries: number; totalPickups: number; total: number; cashTotal: number; transferTotal: number }> = {};
    filteredRentals.forEach((r) => {
      const cash = r.payment_split ? (r.payment_cash_amount || 0) : (r.payment_method?.toLowerCase().includes("efectivo") ? r.total : 0);
      const transfer = r.payment_split ? (r.payment_transfer_amount || 0) : (!r.payment_method?.toLowerCase().includes("efectivo") ? r.total : 0);
      const sameperson = r.delivered_by && r.picked_up_by && r.delivered_by === r.picked_up_by;

      // Registrar entrega
      if (r.delivered_by) {
        if (!map[r.delivered_by]) map[r.delivered_by] = { deliveries: 0, pickups: 0, totalDeliveries: 0, totalPickups: 0, total: 0, cashTotal: 0, transferTotal: 0 };
        map[r.delivered_by].deliveries++;
        map[r.delivered_by].totalDeliveries += r.total;
        // Si es la misma persona que retira, acumular total + cash/transfer aquí (una sola vez)
        if (sameperson) {
          map[r.delivered_by].total += r.total;
          map[r.delivered_by].cashTotal += cash;
          map[r.delivered_by].transferTotal += transfer;
        }
      }

      // Registrar retiro
      if (r.picked_up_by) {
        if (!map[r.picked_up_by]) map[r.picked_up_by] = { deliveries: 0, pickups: 0, totalDeliveries: 0, totalPickups: 0, total: 0, cashTotal: 0, transferTotal: 0 };
        map[r.picked_up_by].pickups++;
        map[r.picked_up_by].totalPickups += r.total;
        // Si son personas distintas, el dinero lo maneja quien retira
        if (!sameperson) {
          map[r.picked_up_by].total += r.total;
          map[r.picked_up_by].cashTotal += cash;
          map[r.picked_up_by].transferTotal += transfer;
        }
      }
    });
    return Object.entries(map).sort(([, a], [, b]) => b.total - a.total);
  }, [filteredRentals]);

  // Services breakdown per person: { personName: [{ zone, serviceType, total, clientName, date }] }
  const personServices = useMemo(() => {
    const map: Record<string, { zone: string; service_type: string; total: number; client_name: string; date: string; role: string; payment_method: string; payment_split: boolean; payment_cash: number; payment_transfer: number }[]> = {};
    filteredRentals.forEach((r) => {
      const base = {
        zone: r.zone,
        service_type: r.service_type || "-",
        total: r.total,
        client_name: r.client_name,
        date: new Date(r.created_at).toLocaleDateString("es-CO"),
        payment_method: r.payment_method || "-",
        payment_split: r.payment_split || false,
        payment_cash: r.payment_cash_amount || 0,
        payment_transfer: r.payment_transfer_amount || 0,
      };
      if (r.delivered_by) {
        if (!map[r.delivered_by]) map[r.delivered_by] = [];
        map[r.delivered_by].push({ ...base, role: "Entrega" });
      }
      if (r.picked_up_by) {
        if (!map[r.picked_up_by]) map[r.picked_up_by] = [];
        map[r.picked_up_by].push({ ...base, role: "Retiro" });
      }
    });
    return map;
  }, [filteredRentals]);

  const personRentals = useMemo(() => {
    if (!selectedPerson) return [];
    return filteredRentals.filter(
      (r) => r.delivered_by === selectedPerson || r.picked_up_by === selectedPerson
    );
  }, [filteredRentals, selectedPerson]);

  const personSummary = useMemo(() => {
    if (!selectedPerson) return { deliveries: 0, pickups: 0, totalDeliveries: 0, totalPickups: 0, total: 0, cashTotal: 0, transferTotal: 0 };
    const data = byPerson.find(([name]) => name === selectedPerson);
    return data ? data[1] : { deliveries: 0, pickups: 0, totalDeliveries: 0, totalPickups: 0, total: 0, cashTotal: 0, transferTotal: 0 };
  }, [byPerson, selectedPerson]);

  const handleExportFinancialCSV = () => {
    exportToCSV("reporte_financiero", ["Fecha", "Ingresos", "Egresos", "Balance", "Estado"],
      byDate.map(([date, d]) => [date, formatCOP(d.income), formatCOP(d.expense), formatCOP(d.income - d.expense), d.closed ? "Cerrado" : "Abierto"]));
  };

  const handleExportFinancialPDF = () => {
    exportToPDF("Reporte Financiero", "reporte_financiero",
      ["Fecha", "Ingresos", "Egresos", "Balance", "Estado"],
      byDate.map(([date, d]) => [date, formatCOP(d.income), formatCOP(d.expense), formatCOP(d.income - d.expense), d.closed ? "Cerrado" : "Abierto"]),
      [{ label: "Total Ingresos", value: formatCOP(totalIncome) }, { label: "Total Egresos", value: formatCOP(totalExpense) }, { label: "Balance", value: formatCOP(totalIncome - totalExpense) }]);
  };

  const handleExportZoneCSV = () => {
    exportToCSV("reporte_zonas", ["Zona", "Servicios", "Total"],
      byZone.map(([zone, d]) => [zone, d.count.toString(), formatCOP(d.total)]));
  };

  const handleExportZonePDF = () => {
    exportToPDF("Reporte por Zona", "reporte_zonas",
      ["Zona", "Servicios", "Total"],
      byZone.map(([zone, d]) => [zone, d.count.toString(), formatCOP(d.total)]));
  };

  const handleExportZoneDetailCSV = () => {
    if (!selectedZone) return;
    exportToCSV(`reporte_zona_${selectedZone}`, ["Cliente", "Servicio", "Repartidor", "Total", "Fecha", "Estado"],
      zoneRentals.map((r) => [
        r.client_name, r.service_type || "-", r.delivered_by || "-", formatCOP(r.total),
        new Date(r.created_at).toLocaleDateString("es-CO"), r.status === "active" ? "Activo" : "Completado",
      ]));
  };

  const handleExportZoneDetailPDF = () => {
    if (!selectedZone) return;
    exportToPDF(`Detalle Zona: ${selectedZone}`, `reporte_zona_${selectedZone}`,
      ["Cliente", "Servicio", "Repartidor", "Total", "Fecha", "Estado"],
      zoneRentals.map((r) => [
        r.client_name, r.service_type || "-", r.delivered_by || "-", formatCOP(r.total),
        new Date(r.created_at).toLocaleDateString("es-CO"), r.status === "active" ? "Activo" : "Completado",
      ]),
      [{ label: "Zona", value: selectedZone }, { label: "Servicios", value: zoneSummary.count.toString() }, { label: "Total", value: formatCOP(zoneSummary.total) }]);
  };

  const totalDeliveries = filteredRentals.filter((r) => r.delivered_by).length;
  const totalPickups    = filteredRentals.filter((r) => r.picked_up_by).length;
  const totalPersonAmount = byPerson.reduce((s, [, d]) => s + d.total, 0);

  const handleExportAllPersonsCSV = () => {
    exportToCSV("reporte_repartidores", ["Repartidor", "Entregas", "$ Entregas", "Retiros", "$ Retiros", "Efectivo", "Transferencia", "Total"],
      byPerson.map(([name, d]) => [name, d.deliveries.toString(), formatCOP(d.totalDeliveries), d.pickups.toString(), formatCOP(d.totalPickups), formatCOP(d.cashTotal), formatCOP(d.transferTotal), formatCOP(d.total)]));
  };

  const handleExportAllPersonsPDF = () => {
    exportToPDF("Reporte por Repartidor", "reporte_repartidores",
      ["Repartidor", "Entregas", "$ Entregas", "Retiros", "$ Retiros", "Efectivo", "Transferencia", "Total"],
      byPerson.map(([name, d]) => [name, d.deliveries.toString(), formatCOP(d.totalDeliveries), d.pickups.toString(), formatCOP(d.totalPickups), formatCOP(d.cashTotal), formatCOP(d.transferTotal), formatCOP(d.total)]),
      [{ label: "Total Entregas", value: totalDeliveries.toString() }, { label: "Total Retiros", value: totalPickups.toString() }, { label: "Total General", value: formatCOP(totalPersonAmount) }]);
  };

  // Build action rows: one row per role (delivery and/or pickup) so row count matches summary counts.
  const personActionRows = useMemo(() => {
    if (!selectedPerson) return [] as (Rental & { _role: string; _fecha: string; _pago: string })[];
    const rows: (Rental & { _role: string; _fecha: string; _pago: string })[] = [];
    personRentals.forEach((r) => {
      const refDate = r.completed_at || r.created_at;
      const fecha = new Date(refDate).toLocaleDateString("es-CO");
      const pago = r.payment_split
        ? `Ef: ${formatCOP(r.payment_cash_amount || 0)} / Tr: ${formatCOP(r.payment_transfer_amount || 0)}`
        : (r.payment_method || "-");
      if (r.delivered_by === selectedPerson) {
        rows.push({ ...r, _role: "Entrega", _fecha: fecha, _pago: pago });
      }
      if (r.picked_up_by === selectedPerson) {
        rows.push({ ...r, _role: "Retiro", _fecha: fecha, _pago: pago });
      }
    });
    return rows;
  }, [personRentals, selectedPerson]);

  const handleExportPersonCSV = () => {
    if (!selectedPerson) return;
    exportToCSV(`cierre_${selectedPerson}`, ["Cliente", "Zona", "Servicio", "Total", "Método Pago", "Fecha", "Rol"],
      personActionRows.map((r) => [
        r.client_name, r.zone, r.service_type || "-", formatCOP(r.total), r._pago, r._fecha, r._role,
      ]));
  };

  const handleExportPersonPDF = () => {
    if (!selectedPerson) return;
    exportToPDF(`Cierre Repartidor: ${selectedPerson}`, `cierre_${selectedPerson}`,
      ["Cliente", "Zona", "Servicio", "Total", "Pago", "Fecha", "Rol"],
      personActionRows.map((r) => [
        r.client_name, r.zone, r.service_type || "-", formatCOP(r.total), r._pago, r._fecha, r._role,
      ]),
      [
        { label: "Repartidor", value: selectedPerson },
        { label: "Entregas", value: personSummary.deliveries.toString() },
        { label: "Retiros", value: personSummary.pickups.toString() },
        { label: "Efectivo", value: formatCOP(personSummary.cashTotal) },
        { label: "Transferencia", value: formatCOP(personSummary.transferTotal) },
        { label: "Total", value: formatCOP(personSummary.total) },
      ]);
  };

  // ── Detalle: cada movimiento de caja en el rango ──
  const detailedEntries = useMemo(() => {
    return allEntries
      .map((e) => ({ ...e, _bogotaDate: toBogotaDate(e.created_at) }))
      .filter((e) => e._bogotaDate >= startDate && e._bogotaDate <= endDate)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [allEntries, startDate, endDate]);

  const categorizedDetail = useMemo(() => {
    const labelFor = (e: CashEntry) => {
      if (e.type === "expense") return "Egreso";
      const cat = (e.category || "").toLowerCase();
      if (cat === "alquiler") return "Ingreso · Alquileres";
      if (cat === "gas") return "Ingreso · Gas";
      return "Ingreso · Otros";
    };
    const groups: Record<string, { items: CashEntry[]; total: number; type: "income" | "expense" }> = {};
    detailedEntries.forEach((e) => {
      const key = labelFor(e);
      if (!groups[key]) groups[key] = { items: [], total: 0, type: e.type };
      groups[key].items.push(e);
      groups[key].total += e.amount;
    });
    // Sort: incomes first by total desc, then expenses
    return Object.entries(groups).sort((a, b) => {
      if (a[1].type !== b[1].type) return a[1].type === "income" ? -1 : 1;
      return b[1].total - a[1].total;
    });
  }, [detailedEntries]);

  const detailIncome = detailedEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const detailExpense = detailedEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  const formatBogotaDateTime = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric" });
    const time = d.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date} ${time}`;
  };

  const handleExportDetailCSV = () => {
    const rows: string[][] = [];
    categorizedDetail.forEach(([cat, g]) => {
      g.items.forEach((e) => {
        rows.push([
          cat,
          formatBogotaDateTime(e.created_at),
          e.description || "-",
          e.type === "income" ? "Ingreso" : "Egreso",
          e.type === "income" ? formatCOP(e.amount) : `-${formatCOP(e.amount)}`,
        ]);
      });
      rows.push([`SUBTOTAL ${cat}`, "", "", "", formatCOP(g.total)]);
    });
    rows.push(["", "", "", "TOTAL INGRESOS", formatCOP(detailIncome)]);
    rows.push(["", "", "", "TOTAL EGRESOS", `-${formatCOP(detailExpense)}`]);
    rows.push(["", "", "", "BALANCE", formatCOP(detailIncome - detailExpense)]);
    exportToCSV("reporte_detallado", ["Categoría", "Fecha y Hora", "Descripción", "Tipo", "Monto"], rows);
  };

  const handleExportDetailPDF = () => {
    const rows: string[][] = [];
    categorizedDetail.forEach(([cat, g]) => {
      g.items.forEach((e) => {
        rows.push([
          cat,
          formatBogotaDateTime(e.created_at),
          (e.description || "-").substring(0, 60),
          e.type === "income" ? formatCOP(e.amount) : `-${formatCOP(e.amount)}`,
        ]);
      });
      rows.push([`SUBTOTAL ${cat}`, "", "", formatCOP(g.total)]);
    });
    exportToPDF(
      `Detalle de Movimientos (${startDate} a ${endDate})`,
      "reporte_detallado",
      ["Categoría", "Fecha/Hora", "Descripción", "Monto"],
      rows,
      [
        { label: "Total Ingresos", value: formatCOP(detailIncome) },
        { label: "Total Egresos", value: formatCOP(detailExpense) },
        { label: "Balance", value: formatCOP(detailIncome - detailExpense) },
        { label: "Movimientos", value: detailedEntries.length.toString() },
      ]
    );
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">Reportes financieros y operativos</p>
      </div>

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

      {/* Summary cards */}
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

      <Tabs defaultValue="financiero" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="zonas">Por Zona</TabsTrigger>
          <TabsTrigger value="personas">Por Repartidor</TabsTrigger>
        </TabsList>

        {/* Financial tab */}
        <TabsContent value="financiero">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="section-title flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Desglose Diario
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={handleExportFinancialCSV}>
                    <Download className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportFinancialPDF}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {byDate.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No hay datos en este rango</p>
              ) : (
                <div className="space-y-2">
                  {byDate.map(([date, data]) => (
                    <div key={date} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary/50 gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {new Date(date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                        {data.closed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">Cerrado</span>}
                        <p className="text-xs text-muted-foreground">{data.count} mov.</p>
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
        </TabsContent>

        {/* Detalle tab — cada centavo */}
        <TabsContent value="detalle">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="section-title flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" /> Detalle de Movimientos
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={handleExportDetailCSV}>
                    <Download className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportDetailPDF}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {detailedEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No hay movimientos en este rango</p>
              ) : (
                <div className="space-y-4">
                  {/* Resumen totales */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-xs text-muted-foreground">Total Ingresos</p>
                      <p className="text-lg font-bold text-success">+{formatCOP(detailIncome)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-muted-foreground">Total Egresos</p>
                      <p className="text-lg font-bold text-destructive">-{formatCOP(detailExpense)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground">Balance ({detailedEntries.length} mov.)</p>
                      <p className="text-lg font-bold">{formatCOP(detailIncome - detailExpense)}</p>
                    </div>
                  </div>

                  {/* Grupos por categoría */}
                  {categorizedDetail.map(([cat, g]) => (
                    <div key={cat} className="rounded-lg border border-border overflow-hidden">
                      <div className={`flex items-center justify-between p-3 ${g.type === "income" ? "bg-success/5" : "bg-destructive/5"}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant={g.type === "income" ? "default" : "destructive"} className="text-[10px]">
                            {g.items.length}
                          </Badge>
                          <p className="font-semibold text-sm">{cat}</p>
                        </div>
                        <p className={`font-bold text-sm ${g.type === "income" ? "text-success" : "text-destructive"}`}>
                          {g.type === "income" ? "+" : "-"}{formatCOP(g.total)}
                        </p>
                      </div>
                      <div className="divide-y divide-border">
                        {g.items.map((e) => (
                          <div key={e.id} className="flex items-start justify-between gap-3 p-3 text-xs hover:bg-secondary/30">
                            <div className="flex-1 min-w-0">
                              <p className="text-muted-foreground font-mono">{formatBogotaDateTime(e.created_at)}</p>
                              <p className="font-medium text-foreground break-words">{e.description || "(sin descripción)"}</p>
                            </div>
                            <p className={`font-semibold whitespace-nowrap ${e.type === "income" ? "text-success" : "text-destructive"}`}>
                              {e.type === "income" ? "+" : "-"}{formatCOP(e.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="zonas">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="section-title flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Rentabilidad por Zona
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={handleExportZoneCSV}>
                    <Download className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportZonePDF}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {byZone.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No hay datos en este rango</p>
              ) : (
                <div className="space-y-2">
                  {byZone.map(([zone, data]) => (
                    <div key={zone} className="rounded-lg bg-secondary/50 overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => setExpandedZone(expandedZone === zone ? null : zone)}
                          >
                            {expandedZone === zone
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div>
                            <p className="font-medium text-sm">{zone}</p>
                            <p className="text-xs text-muted-foreground">{data.count} servicios</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm">{formatCOP(data.total)}</span>
                          <Button size="sm" variant="outline" onClick={() => setSelectedZone(zone)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Detalle
                          </Button>
                        </div>
                      </div>
                      {expandedZone === zone && (
                        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2 ml-8">
                          {Object.entries(data.services).sort(([, a], [, b]) => b.total - a.total).map(([svcName, svcData]) => (
                            <div key={svcName} className="flex items-center justify-between text-sm py-2 px-3 rounded bg-background/50">
                              <div>
                                <span className="font-semibold">{svcName}</span>
                                <span className="text-muted-foreground text-xs ml-2">× {svcData.count}</span>
                              </div>
                              <span className="font-semibold">{formatCOP(svcData.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Person tab */}
        <TabsContent value="personas">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="section-title flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" /> Rendimiento por Repartidor
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={handleExportAllPersonsCSV} disabled={byPerson.length === 0}>
                    <Download className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportAllPersonsPDF} disabled={byPerson.length === 0}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {byPerson.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No hay datos en este rango</p>
              ) : (
                <div className="space-y-4">
                  {/* Summary totals */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-secondary p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Entregas</p>
                      <p className="text-lg font-bold">{totalDeliveries}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Retiros</p>
                      <p className="text-lg font-bold">{totalPickups}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total General</p>
                      <p className="text-lg font-bold text-primary">{formatCOP(totalPersonAmount)}</p>
                    </div>
                  </div>

                  {/* Person list */}
                  <div className="space-y-2">
                    {byPerson.map(([name, data]) => (
                      <div key={name} className="rounded-lg bg-secondary/50 overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setExpandedPerson(expandedPerson === name ? null : name)}
                            >
                              {expandedPerson === name
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <div>
                              <p className="font-medium text-sm">{name}</p>
                              <p className="text-xs text-muted-foreground">
                                {data.deliveries} entregas ({formatCOP(data.totalDeliveries)}) • {data.pickups} retiros ({formatCOP(data.totalPickups)})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                💵 {formatCOP(data.cashTotal)} • 📲 {formatCOP(data.transferTotal)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">{formatCOP(data.total)}</span>
                            <Button size="sm" variant="outline" onClick={() => setSelectedPerson(name)}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Cierre
                            </Button>
                          </div>
                        </div>
                        {expandedPerson === name && personServices[name] && (
                          <div className="px-3 pb-3 space-y-1 border-t border-border pt-2 ml-8">
                            {personServices[name].map((s, i) => (
                              <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-background/50">
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium">{s.client_name}</span>
                                  <span className="text-muted-foreground"> • {s.zone} • {s.service_type}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  <Badge variant={s.role === "Entrega" ? "default" : "secondary"} className="text-[10px]">{s.role}</Badge>
                                  <span className="text-muted-foreground">{s.date}</span>
                                  <span className="font-semibold">{formatCOP(s.total)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delivery person close dialog */}
      <Dialog open={!!selectedPerson} onOpenChange={(open) => { if (!open) setSelectedPerson(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Cierre de Repartidor
            </DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="rounded-lg bg-secondary p-4 space-y-2">
                <p className="font-semibold text-base">{selectedPerson}</p>
               <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Entregas</p>
                    <p className="text-lg font-bold">{personSummary.deliveries}</p>
                    <p className="text-xs text-muted-foreground">{formatCOP(personSummary.totalDeliveries)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retiros</p>
                    <p className="text-lg font-bold">{personSummary.pickups}</p>
                    <p className="text-xs text-muted-foreground">{formatCOP(personSummary.totalPickups)}</p>
                  </div>
                </div>
                <div className="text-center pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Total Generado (entregas)</p>
                  <p className="text-lg font-bold text-primary">{formatCOP(personSummary.total)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">💵 Efectivo</p>
                    <p className="text-sm font-bold text-success">{formatCOP(personSummary.cashTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">📲 Transferencia</p>
                    <p className="text-sm font-bold text-blue-500">{formatCOP(personSummary.transferTotal)}</p>
                  </div>
                </div>
              </div>

              {/* Detail list */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Detalle de servicios</p>
                {personRentals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin servicios en este rango</p>
                ) : (
                  personRentals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{r.client_name}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {r.delivered_by === selectedPerson ? "Entrega" : "Retiro"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.zone} {r.service_type && `• ${r.service_type}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("es-CO")} •{" "}
                          {r.payment_split
                            ? `💵 ${formatCOP(r.payment_cash_amount || 0)} / 📲 ${formatCOP(r.payment_transfer_amount || 0)}`
                            : (r.payment_method || "Sin método")}
                        </p>
                      </div>
                      <span className="font-semibold text-sm whitespace-nowrap">{formatCOP(r.total)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Export buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={handleExportPersonCSV}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportPersonPDF}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
                <DialogClose asChild>
                  <Button size="sm">Cerrar</Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zone detail dialog */}
      <Dialog open={!!selectedZone} onOpenChange={(open) => { if (!open) setSelectedZone(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Detalle de Zona
            </DialogTitle>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-secondary p-4 space-y-2">
                <p className="font-semibold text-base">{selectedZone}</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Servicios</p>
                    <p className="text-lg font-bold">{zoneSummary.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-primary">{formatCOP(zoneSummary.total)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Detalle de servicios</p>
                {zoneRentals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin servicios en este rango</p>
                ) : (
                  zoneRentals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{r.client_name}</p>
                          <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px]">
                            {r.status === "active" ? "Activo" : "Completado"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.service_type || "-"} {r.delivered_by && `• ${r.delivered_by}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      <span className="font-semibold text-sm whitespace-nowrap">{formatCOP(r.total)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={handleExportZoneDetailCSV}>
                  <Download className="h-3.5 w-3.5 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportZoneDetailPDF}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
                <DialogClose asChild>
                  <Button size="sm">Cerrar</Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
