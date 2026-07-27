-- =====================================================
-- FASE D2: Recalcular SOLO ruta ANITA (validación)
-- =====================================================
-- Ejecutar DESPUÉS de FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D1.sql
-- Esperado: capital_actual ~3310 US$ (no 4993 ni 4310)

SELECT nombre_ruta, capital_actual AS capital_antes
FROM public.rutas
WHERE nombre_ruta ILIKE '%ANITA%';

SELECT public.recalcular_capital_ruta(id) AS capital_recalculado
FROM public.rutas
WHERE nombre_ruta ILIKE '%ANITA%';

SELECT nombre_ruta, capital_actual AS capital_despues
FROM public.rutas
WHERE nombre_ruta ILIKE '%ANITA%';
