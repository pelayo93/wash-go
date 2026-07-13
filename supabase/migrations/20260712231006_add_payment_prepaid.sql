-- Agrega soporte para pago adelantado (pagado el día del pedido, antes de completar el servicio)
alter table public.rentals
  add column if not exists payment_prepaid boolean not null default false;

comment on column public.rentals.payment_prepaid is
  'true cuando el cliente pagó por adelantado al momento de registrar el pedido; el ingreso en cash_entries ya fue creado ese día, así que al completar el pedido NO debe generarse un nuevo ingreso.';
