-- =====================================================
-- Garantizar un solo arqueo por ruta y fecha
-- =====================================================
-- Ejecutar en Supabase SQL Editor.
-- Si existen duplicados históricos, resuélvelos antes de crear el índice.

-- 1) Diagnóstico de posibles duplicados
SELECT
  ruta_id,
  fecha_arqueo,
  COUNT(*) AS total
FROM public.arqueos_caja
GROUP BY ruta_id, fecha_arqueo
HAVING COUNT(*) > 1
ORDER BY total DESC, fecha_arqueo DESC;

-- 2) Constraint técnico: unicidad por ruta + fecha
CREATE UNIQUE INDEX IF NOT EXISTS arqueos_caja_ruta_fecha_uidx
ON public.arqueos_caja (ruta_id, fecha_arqueo);
