
-- Payment methods table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payment_methods" ON public.payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage payment_methods" ON public.payment_methods FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default payment methods
INSERT INTO public.payment_methods (name) VALUES ('Efectivo'), ('Transferencia');

-- Add payment fields to rentals
ALTER TABLE public.rentals
  ADD COLUMN payment_method text DEFAULT '' NOT NULL,
  ADD COLUMN payment_split boolean DEFAULT false NOT NULL,
  ADD COLUMN payment_cash_amount integer DEFAULT 0 NOT NULL,
  ADD COLUMN payment_transfer_amount integer DEFAULT 0 NOT NULL,
  ADD COLUMN payment_pending boolean DEFAULT false NOT NULL;
