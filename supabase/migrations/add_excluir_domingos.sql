-- Migración: Añadir campo excluir_domingos a la tabla prestamos
-- Fecha: 2025-12-12
-- Descripción: Permite a los prestamistas excluir domingos del cronograma de cuotas

-- Añadir columna excluir_domingos a prestamos
ALTER TABLE public.prestamos
ADD COLUMN IF NOT EXISTS excluir_domingos BOOLEAN DEFAULT false;

-- Comentario explicativo
COMMENT ON COLUMN public.prestamos.excluir_domingos IS 
'Cuando es true, las fechas de vencimiento de cuotas que caigan en domingo se moverán al lunes siguiente';

