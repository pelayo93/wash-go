import { useState, useEffect, useCallback } from "react";
import { fetchAppSettings } from "@/lib/supabase-data";

export interface Surcharges {
  extraHora: number;
  piso34: number;
  piso56: number;
}

const DEFAULTS: Surcharges = { extraHora: 3000, piso34: 1000, piso56: 2000 };

export function useSurcharges() {
  const [surcharges, setSurcharges] = useState<Surcharges>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const settings = await fetchAppSettings();
      setSurcharges({
        extraHora: settings.extra_hora ?? DEFAULTS.extraHora,
        piso34: settings.piso_3_4 ?? DEFAULTS.piso34,
        piso56: settings.piso_5_6 ?? DEFAULTS.piso56,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { surcharges, loading, reload: load };
}
