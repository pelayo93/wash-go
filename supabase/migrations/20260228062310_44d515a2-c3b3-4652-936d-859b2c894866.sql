
-- Tabla de repartidores
CREATE TABLE public.delivery_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view delivery_people"
  ON public.delivery_people FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage delivery_people"
  ON public.delivery_people FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabla de auditoría de caja
CREATE TABLE public.cash_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  cash_entry_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view audit log"
  ON public.cash_audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert audit log"
  ON public.cash_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = performed_by);
