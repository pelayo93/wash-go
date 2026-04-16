ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
UPDATE public.rentals SET completed_at = created_at WHERE status = 'completed' AND completed_at IS NULL;