
-- Fix permissive UPDATE policy on rentals - restrict to creator or admin
DROP POLICY "Entrega can update rentals" ON public.rentals;
CREATE POLICY "Users can update own rentals or admin" ON public.rentals FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
