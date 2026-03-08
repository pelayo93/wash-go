
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed existing values
INSERT INTO public.app_settings (key, value) VALUES
  ('extra_hora', 3000),
  ('piso_3_4', 1000),
  ('piso_5_6', 2000);
