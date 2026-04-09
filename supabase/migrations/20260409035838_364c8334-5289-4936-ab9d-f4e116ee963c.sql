CREATE POLICY "Admin can delete rentals"
ON public.rentals
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));