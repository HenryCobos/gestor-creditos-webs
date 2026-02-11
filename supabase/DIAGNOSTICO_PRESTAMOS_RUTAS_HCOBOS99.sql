-- =========================================================
-- DIAGNÓSTICO DE PRÉSTAMOS POR RUTA Y ESTADO (HCOBOS99)
-- =========================================================
-- Este script ayuda a ver:
--   - Préstamos por ruta y estado (activo, pagado, etc.)
--   - Préstamos activos sin ruta (ruta_id IS NULL)
-- para la organización del usuario hcobos99@gmail.com.
-- Puedes copiarlo y cambiar el email para otros clientes.
-- =========================================================

-- 1. Préstamos por RUTA y ESTADO
SELECT
  '1. PRESTAMOS POR RUTA Y ESTADO' AS seccion,
  COALESCE(r.nombre_ruta, 'SIN RUTA') AS nombre_ruta,
  pr.estado,
  COUNT(*) AS total_prestamos,
  SUM(pr.monto_prestado) AS total_monto
FROM prestamos pr
LEFT JOIN rutas r ON r.id = pr.ruta_id
JOIN profiles p ON p.id = pr.user_id
WHERE p.organization_id = (
  SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1
)
GROUP BY nombre_ruta, pr.estado
ORDER BY nombre_ruta, pr.estado;

-- 2. Préstamos ACTIVOS sin ruta (ruta_id IS NULL)
SELECT
  '2. PRESTAMOS ACTIVOS SIN RUTA' AS seccion,
  pr.id AS prestamo_id,
  c.nombre AS cliente,
  pr.monto_prestado,
  pr.estado,
  pr.ruta_id
FROM prestamos pr
JOIN clientes c ON c.id = pr.cliente_id
JOIN profiles p ON p.id = pr.user_id
WHERE p.organization_id = (
  SELECT organization_id FROM profiles WHERE email = 'hcobos99@gmail.com' LIMIT 1
)
AND pr.estado IN ('activo', 'pendiente')
AND pr.ruta_id IS NULL
ORDER BY c.nombre;

