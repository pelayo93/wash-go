
-- Zones table
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view zones" ON public.zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage zones" ON public.zones FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Zone prices table
CREATE TABLE public.zone_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(zone_id, service_name)
);

ALTER TABLE public.zone_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view zone_prices" ON public.zone_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage zone_prices" ON public.zone_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed existing data
WITH z1 AS (INSERT INTO public.zones (name) VALUES ('Itagüí') RETURNING id, name),
     z2 AS (INSERT INTO public.zones (name) VALUES ('Envigado y Sabaneta') RETURNING id, name),
     z3 AS (INSERT INTO public.zones (name) VALUES ('Villalia, San Gabriel, Limonar, San Francisco') RETURNING id, name),
     z4 AS (INSERT INTO public.zones (name) VALUES ('Prado y Estrella') RETURNING id, name),
     z5 AS (INSERT INTO public.zones (name) VALUES ('Colinitas y Cristo Rey') RETURNING id, name),
     z6 AS (INSERT INTO public.zones (name) VALUES ('Belén y Tablaza') RETURNING id, name)
INSERT INTO public.zone_prices (zone_id, service_name, price) VALUES
  ((SELECT id FROM z1), '3h', 16000),
  ((SELECT id FROM z1), 'Día', 26000),
  ((SELECT id FROM z1), 'Amanecida', 22000),
  ((SELECT id FROM z1), '24h', 32000),
  ((SELECT id FROM z1), 'Promo', 42000),
  ((SELECT id FROM z2), '24h', 37000),
  ((SELECT id FROM z2), 'Promo', 47000),
  ((SELECT id FROM z3), 'Amanecida', 27000),
  ((SELECT id FROM z3), '24h', 37000),
  ((SELECT id FROM z3), 'Promo', 47000),
  ((SELECT id FROM z4), '24h', 37000),
  ((SELECT id FROM z4), 'Promo', 47000),
  ((SELECT id FROM z5), 'Amanecida', 27000),
  ((SELECT id FROM z5), '24h', 37000),
  ((SELECT id FROM z5), 'Promo', 47000),
  ((SELECT id FROM z6), '24h', 42000),
  ((SELECT id FROM z6), 'Promo', 52000);
