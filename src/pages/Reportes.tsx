import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, FileText, MapPin, UserCheck, Eye, ChevronDown, ChevronUp } from "lucide-react";
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
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [dailyCloses, setDailyCloses] = useState<any[]>([]);
  const [allRentals, setAllRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

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
      const date = e.created_at.split("T")[0];
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

  // Rentals in range
  const filteredRentals = useMemo(() =>
    allRentals.filter((r) => {
      const d = r.created_at.split("T")[0];
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
      if (r.delivered_by) {
        if (!map[r.delivered_by]) map[r.delivered_by] = { deliveries: 0, pickups: 0, totalDeliveries: 0, totalPickups: 0, total: 0, cashTotal: 0, transferTotal: 0 };
        map[r.delivered_by].deliveries++;
        map[r.delivered_by].totalDeliveries += r.total;
        map[r.delivered_by].total += r.total;
        map[r.delivered_by].cashTotal += cash;
        map[r.delivered_by].transferTotal += transfer;
      }
      if (r.picked_up_by) {
        if (!map[r.picked_up_by]) map[r.picked_up_by] = { deliveries: 0, pickups: 0, totalDeliveries: 0, totalPickups: 0, total: 0, cashTotal: 0, transferTotal: 0 };
        map[r.picked_up_by].pickups++;
        map[r.picked_up_by].totalPickups += r.total;
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

  const totalDeliveries = byPerson.reduce((s, [, d]) => s + d.deliveries, 0);
  const totalPickups = byPerson.reduce((s, [, d]) => s + d.pickups, 0);
  const totalPersonAmount = byPerson.reduce((s, [, d]) => s + d.total, 0);

  const handleExportAllPersonsCSV = () => {
    exportToCSV("reporte_repartidores", ["Repartidor", "Entregas", "$ Entregas", "Retiros", "$ Retiros", "Total"],
      byPerson.map(([name, d]) => [name, d.deliveries.toString(), formatCOP(d.totalDeliveries), d.pickups.toString(), formatCOP(d.totalPickups), formatCOP(d.total)]));
  };

  const handleExportAllPersonsPDF = () => {
    exportToPDF("Reporte por Repartidor", "reporte_repartidores",
      ["Repartidor", "Entregas", "$ Entregas", "Retiros", "$ Retiros", "Total"],
      byPerson.map(([name, d]) => [name, d.deliveries.toString(), formatCOP(d.totalDeliveries), d.pickups.toString(), formatCOP(d.totalPickups), formatCOP(d.total)]),
      [{ label: "Total Entregas", value: totalDeliveries.toString() }, { label: "Total Retiros", value: totalPickups.toString() }, { label: "Total General", value: formatCOP(totalPersonAmount) }]);
  };

  const handleExportPersonCSV = () => {
    if (!selectedPerson) return;
    exportToCSV(`cierre_${selectedPerson}`, ["Cliente", "Zona", "Servicio", "Total", "Fecha", "Rol"],
      personRentals.map((r) => [
        r.client_name, r.zone, r.service_type || "-", formatCOP(r.total),
        new Date(r.created_at).toLocaleDateString("es-CO"),
        r.delivered_by === selectedPerson ? "Entrega" : "Retiro",
      ]));
  };

  const handleExportPersonPDF = () => {
    if (!selectedPerson) return;
    exportToPDF(`Cierre Repartidor: ${selectedPerson}`, `cierre_${selectedPerson}`,
      ["Cliente", "Zona", "Servicio", "Total", "Fecha", "Rol"],
      personRentals.map((r) => [
        r.client_name, r.zone, r.service_type || "-", formatCOP(r.total),
        new Date(r.created_at).toLocaleDateString("es-CO"),
        r.delivered_by === selectedPerson ? "Entrega" : "Retiro",
      ]),
      [
        { label: "Repartidor", value: selectedPerson },
        { label: "Entregas", value: personSummary.deliveries.toString() },
        { label: "Retiros", value: personSummary.pickups.toString() },
        { label: "Total", value: formatCOP(personSummary.total) },
      ]);
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

        {/* Zone tab */}
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
