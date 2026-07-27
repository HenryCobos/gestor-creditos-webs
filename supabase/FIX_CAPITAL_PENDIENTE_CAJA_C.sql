-- =====================================================
-- FASE C: Recalcular el resto de rutas
-- =====================================================
-- Ejecutar SOLO tras validar ANITA (~3310) en Fase B.
-- Comunicar a clientes: saldos pueden bajar donde hubo liquidaciones
-- con capital ya cobrado (mismo bug corregido en ANITA).

SELECT public.recalcular_capital_ruta(r.id) AS capital_recalculado, r.nombre_ruta
FROM public.rutas r
WHERE r.nombre_ruta NOT ILIKE '%ANITA%'
ORDER BY r.nombre_ruta;

-- Verificación final
SELECT nombre_ruta, capital_actual
FROM public.rutas
ORDER BY nombre_ruta;
