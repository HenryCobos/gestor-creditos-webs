-- =====================================================
-- VALIDAR ARQUEOS DE CAJA (ejecutar en Supabase → SQL Editor)
-- Reemplaza el email si quieres filtrar por organización del admin
-- =====================================================

-- Parámetro opcional: email del admin de la org
-- SET LOCAL no funciona en SQL Editor; usa el WHERE con tu email abajo

-- =====================================================
-- [1] TRIGGERS DE CAPITAL (pagos y préstamos → rutas.capital_actual)
-- Debe devolver 2 filas: trigger en prestamos y trigger en pagos
-- =====================================================
SELECT '=== [1] TRIGGERS DE CAPITAL EN BD ===' AS seccion;

SELECT
  t.tgname AS trigger_name,
  c.relname AS tabla,
  p.proname AS funcion,
  CASE t.tgenabled
    WHEN 'O' THEN 'activo'
    WHEN 'D' THEN 'desactivado'
    ELSE t.tgenabled::text
  END AS estado_trigger
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('pagos', 'prestamos')
  AND NOT t.tgisinternal
  AND (p.proname ILIKE '%capital%' OR t.tgname ILIKE '%capital%')
ORDER BY c.relname, t.tgname;

-- Si sale vacío: los triggers no están instalados → capital_actual no se actualiza solo

-- =====================================================
-- [2] RUTAS: capital_actual vs movimiento del día (coherencia)
-- Compara capital en rutas con pagos/préstamos/gastos de HOY por ruta
-- =====================================================
SELECT '=== [2] RUTAS Y MOVIMIENTO DE HOY ===' AS seccion;

SELECT
  r.id AS ruta_id,
  r.nombre_ruta,
  p.email AS cobrador_email,
  r.capital_inicial,
  r.capital_actual,
  COALESCE(pagos_hoy.total_pagos_hoy, 0) AS pagos_hoy,
  COALESCE(prestamos_hoy.total_prestamos_hoy, 0) AS prestamos_entregados_hoy,
  COALESCE(gastos_hoy.total_gastos_hoy, 0) AS gastos_aprobados_hoy,
  COUNT(pr.id) FILTER (WHERE pr.estado = 'activo') AS prestamos_activos,
  COUNT(pr.id) FILTER (WHERE pr.ruta_id IS NULL) AS prestamos_sin_ruta_en_org
FROM public.rutas r
LEFT JOIN public.profiles p ON p.id = r.cobrador_id
LEFT JOIN public.prestamos pr ON pr.ruta_id = r.id
LEFT JOIN LATERAL (
  SELECT SUM(pg.monto_pagado) AS total_pagos_hoy
  FROM public.pagos pg
  INNER JOIN public.prestamos pr2 ON pr2.id = pg.prestamo_id
  WHERE pr2.ruta_id = r.id
    AND pg.fecha_pago >= CURRENT_DATE
    AND pg.fecha_pago < CURRENT_DATE + INTERVAL '1 day'
) pagos_hoy ON true
LEFT JOIN LATERAL (
  SELECT SUM(pr3.monto_prestado) AS total_prestamos_hoy
  FROM public.prestamos pr3
  WHERE pr3.ruta_id = r.id
    AND pr3.created_at >= CURRENT_DATE
    AND pr3.created_at < CURRENT_DATE + INTERVAL '1 day'
) prestamos_hoy ON true
LEFT JOIN LATERAL (
  SELECT SUM(g.monto) AS total_gastos_hoy
  FROM public.gastos g
  WHERE g.ruta_id = r.id
    AND g.fecha_gasto = CURRENT_DATE
    AND g.aprobado = true
) gastos_hoy ON true
WHERE r.estado = 'activa'
  -- Opcional: solo tu org (descomenta y pon tu email):
  -- AND r.organization_id = (
  --   SELECT organization_id FROM public.profiles WHERE email = 'hcobos99@gmail.com'
  -- )
GROUP BY
  r.id, r.nombre_ruta, p.email, r.capital_inicial, r.capital_actual,
  pagos_hoy.total_pagos_hoy, prestamos_hoy.total_prestamos_hoy, gastos_hoy.total_gastos_hoy
ORDER BY r.nombre_ruta;

-- Qué mirar:
-- • prestamos_sin_ruta_en_org = 0 idealmente por ruta
-- • Si pagaste hoy y pagos_hoy > 0, capital_actual debería haber subido (vs ayer o tras el pago)

-- =====================================================
-- [3] ÚLTIMOS ARQUEOS (rendiciones guardadas)
-- =====================================================
SELECT '=== [3] ÚLTIMOS 20 ARQUEOS ===' AS seccion;

SELECT
  a.fecha_arqueo,
  r.nombre_ruta,
  cob.nombre_completo AS cobrador,
  cob.email AS cobrador_email,
  a.dinero_esperado,
  a.dinero_reportado,
  a.diferencia,
  a.estado,
  CASE WHEN a.revisado_por IS NOT NULL THEN '✅ Revisado' ELSE '⏳ Pendiente' END AS revision_admin,
  rev.nombre_completo AS revisado_por_nombre,
  a.created_at::timestamp(0) AS registrado_en
FROM public.arqueos_caja a
JOIN public.rutas r ON r.id = a.ruta_id
LEFT JOIN public.profiles cob ON cob.id = a.cobrador_id
LEFT JOIN public.profiles rev ON rev.id = a.revisado_por
-- Opcional: filtrar por org del admin:
-- WHERE a.organization_id = (
--   SELECT organization_id FROM public.profiles WHERE email = 'hcobos99@gmail.com'
-- )
ORDER BY a.fecha_arqueo DESC, a.created_at DESC
LIMIT 20;

-- =====================================================
-- BONUS: ¿Existe la tabla y restricción 1 arqueo por ruta/día?
-- =====================================================
SELECT '=== [BONUS] ESTRUCTURA arqueos_caja ===' AS seccion;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'arqueos_caja'
) AS tabla_arqueos_existe;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'arqueos_caja'
  AND indexdef ILIKE '%unique%';
