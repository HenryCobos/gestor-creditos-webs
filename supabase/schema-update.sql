-- Script para actualizar el esquema y agregar frecuencias de pago
-- Ejecuta esto en Supabase SQL Editor

-- Agregar nuevas columnas a la tabla prestamos
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS frecuencia_pago TEXT DEFAULT 'mensual' CHECK (frecuencia_pago IN ('diario', 'semanal', 'quincenal', 'mensual'));

-- Agregar columna para el tipo de interés (simple o compuesto)
ALTER TABLE public.prestamos 
ADD COLUMN IF NOT EXISTS tipo_interes TEXT DEFAULT 'simple' CHECK (tipo_interes IN ('simple', 'compuesto'));

-- Actualizar prestamos existentes con valores por defecto
UPDATE public.prestamos 
SET frecuencia_pago = 'mensual' 
WHERE frecuencia_pago IS NULL;

UPDATE public.prestamos 
SET tipo_interes = 'simple' 
WHERE tipo_interes IS NULL;

