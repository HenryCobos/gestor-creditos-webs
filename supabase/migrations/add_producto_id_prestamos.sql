-- Vincular préstamo tipo venta_credito con catálogo de productos (nullable, retrocompatible)
ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS producto_id UUID DEFAULT NULL;

COMMENT ON COLUMN public.prestamos.producto_id IS
  'Opcional: producto vendido a crédito cuando existe tabla productos en la instancia';
