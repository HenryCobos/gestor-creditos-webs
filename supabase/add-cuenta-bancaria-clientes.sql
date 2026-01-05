-- Script para añadir el campo cuenta_bancaria a la tabla clientes
-- Ejecuta este script en Supabase SQL Editor

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS cuenta_bancaria TEXT;

-- Comentario en la columna
COMMENT ON COLUMN public.clientes.cuenta_bancaria IS 'Número de cuenta bancaria del cliente';

