import { useState, useEffect, useCallback } from "react";
import { fetchZones, fetchZonePrices } from "@/lib/supabase-data";
import type { Zone, ZonePrice } from "@/types";

export interface ZonePricing {
  name: string;
  id: string;
  prices: Record<string, number>;
}

export function useZones() {
  const [zones, setZones] = useState<ZonePricing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [zoneRows, priceRows] = await Promise.all([
        fetchZones(),
        fetchZonePrices(),
      ]);
      const mapped: ZonePricing[] = zoneRows.map((z: Zone) => {
        const prices: Record<string, number> = {};
        priceRows
          .filter((p: ZonePrice) => p.zone_id === z.id)
          .forEach((p: ZonePrice) => {
            prices[p.service_name] = p.price;
          });
        return { id: z.id, name: z.name, prices };
      });
      setZones(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { zones, loading, reload: load };
}
