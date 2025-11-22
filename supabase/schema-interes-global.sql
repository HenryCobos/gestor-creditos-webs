-- Script SQL para agregar soporte de interés global vs por período
-- Ejecutar esto en Supabase SQL Editor

-- Agregar campo tipo_calculo_interes a la tabla prestamos
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS tipo_calculo_interes TEXT DEFAULT 'por_periodo' 
CHECK (tipo_calculo_interes IN ('por_periodo', 'global'));

-- Actualizar préstamos existentes con valor por defecto
UPDATE public.prestamos 
SET tipo_calculo_interes = 'por_periodo' 
WHERE tipo_calculo_interes IS NULL;

