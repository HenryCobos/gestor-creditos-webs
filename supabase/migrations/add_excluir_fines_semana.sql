-- Migración: Añadir campo excluir_fines_semana a la tabla prestamos
-- Fecha: 2026-05-12
-- Descripción: Permite excluir sábados y domingos del cronograma de cuotas
--              (útil para prestamistas que solo trabajan de lunes a viernes)

ALTER TABLE public.prestamos
ADD COLUMN IF NOT EXISTS excluir_fines_semana BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.prestamos.excluir_fines_semana IS
'Cuando es true, las fechas de vencimiento de cuotas que caigan en sábado o domingo se moverán al lunes siguiente';
