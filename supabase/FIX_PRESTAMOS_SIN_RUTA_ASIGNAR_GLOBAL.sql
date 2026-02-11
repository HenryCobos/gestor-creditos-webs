-- =========================================================
-- FIX GLOBAL: ASIGNAR RUTA A PRÉSTAMOS SIN RUTA
-- =========================================================
-- Objetivo:
--   - Para TODAS las organizaciones:
--   - Encontrar préstamos ACTIVO/PENDIENTE con ruta_id = NULL
--   - Asignarles automáticamente la ruta ACTIVA de su cliente
--     (solo cuando el cliente tiene EXACTAMENTE UNA ruta activa)
--
-- Seguridad:
--   - No toca préstamos que ya tienen ruta_id
--   - No toca préstamos con clientes en 0 o varias rutas activas
--   - No cambia nada de clientes, rutas ni capital inicial
--   - Los triggers existentes de capital se encargan de recalcular
-- =========================================================

-- 1. Diagnóstico ANTES: préstamos activos/pedientes sin ruta por organización
SELECT 
  'ANTES' AS seccion,
  COALESCE(o.nombre_negocio, '[SIN ORGANIZACIÓN]') AS organizacion,
  COUNT(*) AS prestamos_sin_ruta
FROM prestamos pr
JOIN profiles p ON p.id = pr.user_id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE pr.ruta_id IS NULL
  AND pr.estado IN ('activo', 'pendiente')
GROUP BY organizacion
ORDER BY prestamos_sin_ruta DESC;

-- 2. Asignar ruta a préstamos según la ruta ACTIVA del cliente
WITH clientes_con_ruta_unica AS (
  SELECT 
    rc.cliente_id,
    MAX(rc.ruta_id) AS ruta_id
  FROM ruta_clientes rc
  WHERE rc.activo = true
  GROUP BY rc.cliente_id
  HAVING COUNT(*) = 1  -- solo clientes con UNA sola ruta activa
),
prestamos_actualizados AS (
  UPDATE prestamos pr
  SET 
    ruta_id = c.ruta_id,
    updated_at = NOW()
  FROM clientes_con_ruta_unica c
  WHERE pr.cliente_id = c.cliente_id
    AND pr.ruta_id IS NULL
    AND pr.estado IN ('activo', 'pendiente')
  RETURNING pr.id, pr.cliente_id, pr.ruta_id, pr.estado
)
SELECT 
  'ACTUALIZADOS' AS seccion,
  COUNT(*) AS prestamos_actualizados
FROM prestamos_actualizados;

-- 3. Diagnóstico DESPUÉS: verificar que se redujeron los préstamos sin ruta
SELECT 
  'DESPUÉS' AS seccion,
  COALESCE(o.nombre_negocio, '[SIN ORGANIZACIÓN]') AS organizacion,
  COUNT(*) AS prestamos_sin_ruta
FROM prestamos pr
JOIN profiles p ON p.id = pr.user_id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE pr.ruta_id IS NULL
  AND pr.estado IN ('activo', 'pendiente')
GROUP BY organizacion
ORDER BY prestamos_sin_ruta DESC;

-- 4. (Opcional) Ver detalle de algunos préstamos que aún queden sin ruta
--    Puedes ejecutar solo esta parte si quieres investigar casos raros.
-- SELECT 
--   pr.id AS prestamo_id,
--   pr.estado,
--   pr.monto_prestado,
--   c.nombre AS cliente,
--   p.email AS creado_por,
--   o.nombre_negocio AS organizacion
-- FROM prestamos pr
-- JOIN clientes c ON c.id = pr.cliente_id
-- JOIN profiles p ON p.id = pr.user_id
-- LEFT JOIN organizations o ON o.id = p.organization_id
-- WHERE pr.ruta_id IS NULL
--   AND pr.estado IN ('activo', 'pendiente')
-- ORDER BY o.nombre_negocio, c.nombre;

