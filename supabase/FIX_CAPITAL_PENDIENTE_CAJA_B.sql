-- =====================================================
-- FASE B: Prueba en ruta ANITA únicamente
-- =====================================================
-- Ejecutar DESPUÉS de FIX_CAPITAL_PENDIENTE_CAJA_A.sql
-- Esperado: capital_actual baja ~1000 (de ~4310 → ~3310)
-- Si no cuadra: NO ejecutar Fase C. Ver rollback en plan.

-- 1) Saldo ANTES
SELECT nombre_ruta, capital_actual AS capital_antes
FROM public.rutas
WHERE nombre_ruta ILIKE '%ANITA%';

-- 2) Capital pendiente por préstamo activo en ANITA
SELECT pr.id, c.nombre, pr.monto_prestado, pr.estado,
       public.capital_pendiente_prestamo(pr.id) AS capital_pendiente
FROM public.prestamos pr
JOIN public.clientes c ON c.id = pr.cliente_id
JOIN public.rutas r ON r.id = pr.ruta_id
WHERE r.nombre_ruta ILIKE '%ANITA%'
  AND pr.estado IN ('activo', 'pendiente');

-- 3) Recalcular SOLO ANITA
SELECT public.recalcular_capital_ruta(id) AS capital_recalculado
FROM public.rutas
WHERE nombre_ruta ILIKE '%ANITA%';

-- 4) Saldo DESPUÉS
SELECT nombre_ruta, capital_actual AS capital_despues
FROM public.rutas
WHERE nombre_ruta ILIKE '%ANITA%';
