alter table public.rentals
  add column if not exists washer_number text;

comment on column public.rentals.washer_number is
  'Número de la lavadora física asignada a este pedido (1 al 35). Opcional.';

alter table public.rentals
  add column if not exists washer_brand text;

comment on column public.rentals.washer_brand is
  'Marca de la lavadora: Mabe o Acem. Opcional.';
