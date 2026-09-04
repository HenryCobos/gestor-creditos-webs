-- =====================================================================
-- REPARACIÓN: Ruta ANITA — clientes/préstamos huérfanos y caja descuadrada
-- =====================================================================
-- Contexto:
--   La ruta ANITA es la única ruta de la organización y, según lo
--   confirmado por el usuario, los 13 clientes del panel admin son
--   manejados por ella. Sin embargo, el diálogo "Asignar Clientes a
--   Ruta" solo tiene 5 marcados como "en esta ruta" (activo=true en
--   ruta_clientes). El resto quedó "huérfano": sin ruta_clientes activo
--   y, para los préstamos activos/pendientes de esos clientes, con
--   prestamos.ruta_id = NULL (por el trigger asignar_prestamos_a_ruta).
--
--   Esto causa:
--     1) Conteos distintos entre admin (org-wide) y cobrador (route-wide)
--     2) Préstamos visibles para el cobrador con "Cliente: -"
--     3) Caja de ANITA descuadrada (recalcular_capital_ruta no resta
--        el monto_prestado de los préstamos huérfanos porque su
--        ruta_id es NULL)
--
-- Cómo usar este script:
--   1) Ejecuta la SECCIÓN 1 (diagnóstico) y revisa los resultados.
--   2) Si los números tienen sentido, ejecuta la SECCIÓN 2 (reparación).
--   3) Ejecuta la SECCIÓN 3 (verificación) y confirma que todo cuadra.
--
-- No modifica la fórmula de recalcular_capital_ruta ni ninguna otra
-- lógica de negocio: solo corrige los datos (ruta_clientes.activo y
-- prestamos.ruta_id) que esa fórmula usa como insumo.
-- =====================================================================


-- =====================================================================
-- SECCIÓN 1: DIAGNÓSTICO (solo lectura)
-- =====================================================================

-- 1a) Identificar la ruta ANITA y su organización
SELECT
  r.id AS ruta_id,
  r.nombre_ruta,
  r.organization_id,
  r.cobrador_id,
  pr.email AS cobrador_email,
  pr.full_name AS cobrador_nombre,
  r.capital_inicial,
  r.capital_actual,
  r.estado
FROM rutas r
LEFT JOIN profiles pr ON pr.id = r.cobrador_id
WHERE r.nombre_ruta ILIKE '%ANITA%';

-- 1b) Todos los clientes de la organización de ANITA con su estado real
--     de asignación a ruta_clientes (activo / inactivo / nunca asignado)
WITH ruta_anita AS (
  SELECT id AS ruta_id, organization_id
  FROM rutas
  WHERE nombre_ruta ILIKE '%ANITA%'
  LIMIT 1
)
SELECT
  c.id AS cliente_id,
  c.nombre,
  c.user_id AS creado_por,
  cp.email AS creado_por_email,
  rc.activo AS ruta_clientes_activo,
  rc.ruta_id AS ruta_clientes_ruta_id,
  CASE
    WHEN rc.id IS NULL THEN 'NUNCA ASIGNADO'
    WHEN rc.activo = true AND rc.ruta_id = ra.ruta_id THEN 'OK: en ANITA'
    WHEN rc.activo = true AND rc.ruta_id <> ra.ruta_id THEN 'EN OTRA RUTA'
    WHEN rc.activo = false THEN 'DESACTIVADO (huérfano)'
  END AS estado_asignacion,
  (
    SELECT COUNT(*) FROM prestamos p
    WHERE p.cliente_id = c.id AND p.estado IN ('activo', 'pendiente')
  ) AS prestamos_activos_pendientes,
  (
    SELECT COUNT(*) FROM prestamos p
    WHERE p.cliente_id = c.id
      AND p.estado IN ('activo', 'pendiente')
      AND (p.ruta_id IS NULL OR p.ruta_id <> ra.ruta_id)
  ) AS prestamos_sin_ruta_correcta
FROM clientes c
JOIN profiles cp ON cp.id = c.user_id
CROSS JOIN ruta_anita ra
LEFT JOIN ruta_clientes rc
  ON rc.cliente_id = c.id AND rc.ruta_id = ra.ruta_id
WHERE cp.organization_id = ra.organization_id
ORDER BY estado_asignacion, c.nombre;

-- 1c) Préstamos activos/pendientes con ruta_id incorrecto o NULL,
--     de clientes de la organización de ANITA (estos son los que
--     hoy NO se restan de la caja de ANITA)
WITH ruta_anita AS (
  SELECT id AS ruta_id, organization_id
  FROM rutas
  WHERE nombre_ruta ILIKE '%ANITA%'
  LIMIT 1
)
SELECT
  p.id AS prestamo_id,
  c.nombre AS cliente,
  p.monto_prestado,
  p.estado,
  p.ruta_id AS ruta_id_actual,
  ra.ruta_id AS ruta_id_esperado,
  p.created_at
FROM prestamos p
JOIN clientes c ON c.id = p.cliente_id
JOIN profiles cp ON cp.id = c.user_id
CROSS JOIN ruta_anita ra
WHERE cp.organization_id = ra.organization_id
  AND p.estado IN ('activo', 'pendiente')
  AND (p.ruta_id IS NULL OR p.ruta_id <> ra.ruta_id)
ORDER BY c.nombre;

-- 1d) Total de monto_prestado huérfano (esto es lo que le falta
--     restar a la caja de ANITA hoy)
WITH ruta_anita AS (
  SELECT id AS ruta_id, organization_id
  FROM rutas
  WHERE nombre_ruta ILIKE '%ANITA%'
  LIMIT 1
)
SELECT
  COALESCE(SUM(p.monto_prestado), 0) AS total_monto_prestado_huerfano,
  COUNT(*) AS cantidad_prestamos_huerfanos
FROM prestamos p
JOIN clientes c ON c.id = p.cliente_id
JOIN profiles cp ON cp.id = c.user_id
CROSS JOIN ruta_anita ra
WHERE cp.organization_id = ra.organization_id
  AND p.estado IN ('activo', 'pendiente')
  AND (p.ruta_id IS NULL OR p.ruta_id <> ra.ruta_id);


-- =====================================================================
-- SECCIÓN 2: REPARACIÓN
-- =====================================================================
-- Ejecuta esta sección completa de una sola vez (es un solo bloque DO).
-- Es idempotente: se puede correr más de una vez sin duplicar datos.

DO $$
DECLARE
  v_ruta_id UUID;
  v_org_id UUID;
  v_clientes_vinculados INT := 0;
  v_prestamos_sincronizados INT := 0;
  v_capital_final NUMERIC;
BEGIN
  SELECT id, organization_id INTO v_ruta_id, v_org_id
  FROM rutas
  WHERE nombre_ruta ILIKE '%ANITA%'
  LIMIT 1;

  IF v_ruta_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la ruta ANITA';
  END IF;

  RAISE NOTICE 'Ruta ANITA: % (org: %)', v_ruta_id, v_org_id;

  -- 2a) Vincular (o reactivar) TODOS los clientes de la organización
  --     a la ruta ANITA. Idempotente vía ON CONFLICT.
  WITH vinculados AS (
    INSERT INTO ruta_clientes (ruta_id, cliente_id, activo, fecha_asignacion)
    SELECT v_ruta_id, c.id, true, NOW()
    FROM clientes c
    JOIN profiles cp ON cp.id = c.user_id
    WHERE cp.organization_id = v_org_id
    ON CONFLICT (ruta_id, cliente_id)
    DO UPDATE SET activo = true
    WHERE ruta_clientes.activo IS DISTINCT FROM true
    RETURNING cliente_id
  )
  SELECT COUNT(*) INTO v_clientes_vinculados FROM vinculados;

  RAISE NOTICE 'Clientes vinculados/reactivados en ANITA: %', v_clientes_vinculados;

  -- 2b) Desactivar cualquier asignación de esos clientes hacia OTRAS
  --     rutas de la MISMA organización (evita que un cliente quede
  --     activo en dos rutas a la vez; no debería haber ninguna dado
  --     que ANITA es la única ruta, pero se hace por seguridad).
  UPDATE ruta_clientes rc
  SET activo = false
  FROM clientes c
  JOIN profiles cp ON cp.id = c.user_id
  WHERE rc.cliente_id = c.id
    AND cp.organization_id = v_org_id
    AND rc.ruta_id <> v_ruta_id
    AND rc.activo = true;

  -- 2c) Sincronizar ruta_id de préstamos activo/pendiente de todos los
  --     clientes de la organización hacia ANITA (backup por si el
  --     trigger de ruta_clientes no alcanzó a correr para alguno).
  WITH sincronizados AS (
    UPDATE prestamos p
    SET ruta_id = v_ruta_id, updated_at = NOW()
    FROM clientes c
    JOIN profiles cp ON cp.id = c.user_id
    WHERE p.cliente_id = c.id
      AND cp.organization_id = v_org_id
      AND p.estado IN ('activo', 'pendiente')
      AND (p.ruta_id IS NULL OR p.ruta_id <> v_ruta_id)
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_prestamos_sincronizados FROM sincronizados;

  RAISE NOTICE 'Préstamos re-sincronizados a ANITA: %', v_prestamos_sincronizados;

  -- 2d) Recalcular capital de ANITA con los datos ya corregidos
  SELECT recalcular_capital_ruta(v_ruta_id) INTO v_capital_final;

  RAISE NOTICE 'Capital de ANITA recalculado: %', v_capital_final;
  RAISE NOTICE '✅ Reparación completada';
END $$;


-- =====================================================================
-- SECCIÓN 3: VERIFICACIÓN (ejecutar después de la Sección 2)
-- =====================================================================

-- 3a) Debe mostrar clientes_asignados = 13 (o el total real de la org)
--     y prestamos_asignados coherente con lo que ves en el panel admin
SELECT
  r.nombre_ruta,
  r.id AS ruta_id,
  r.capital_actual,
  COUNT(DISTINCT rc.cliente_id) FILTER (WHERE rc.activo = true) AS clientes_asignados,
  COUNT(DISTINCT p.id) FILTER (WHERE p.estado IN ('activo', 'pendiente')) AS prestamos_activos_en_ruta
FROM rutas r
LEFT JOIN ruta_clientes rc ON rc.ruta_id = r.id
LEFT JOIN prestamos p ON p.ruta_id = r.id
WHERE r.nombre_ruta ILIKE '%ANITA%'
GROUP BY r.id, r.nombre_ruta, r.capital_actual;

-- 3b) No debería quedar ningún préstamo huérfano de esta organización
WITH ruta_anita AS (
  SELECT id AS ruta_id, organization_id
  FROM rutas
  WHERE nombre_ruta ILIKE '%ANITA%'
  LIMIT 1
)
SELECT COUNT(*) AS prestamos_huerfanos_restantes
FROM prestamos p
JOIN clientes c ON c.id = p.cliente_id
JOIN profiles cp ON cp.id = c.user_id
CROSS JOIN ruta_anita ra
WHERE cp.organization_id = ra.organization_id
  AND p.estado IN ('activo', 'pendiente')
  AND (p.ruta_id IS NULL OR p.ruta_id <> ra.ruta_id);

-- 3c) Todos los clientes de la org deben quedar "OK: en ANITA"
WITH ruta_anita AS (
  SELECT id AS ruta_id, organization_id
  FROM rutas
  WHERE nombre_ruta ILIKE '%ANITA%'
  LIMIT 1
)
SELECT
  c.nombre,
  rc.activo AS ruta_clientes_activo
FROM clientes c
JOIN profiles cp ON cp.id = c.user_id
CROSS JOIN ruta_anita ra
LEFT JOIN ruta_clientes rc ON rc.cliente_id = c.id AND rc.ruta_id = ra.ruta_id
WHERE cp.organization_id = ra.organization_id
ORDER BY c.nombre;
