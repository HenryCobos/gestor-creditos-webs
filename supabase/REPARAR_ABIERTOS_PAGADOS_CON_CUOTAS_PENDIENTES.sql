-- Préstamos abiertos marcados pagado con deuda de interés pendiente (capital ya en cero).
-- Ejecutar en Supabase SQL Editor tras desplegar el fix de aplicación (o antes para corregir listados).

-- 1) Auditoría
SELECT
  p.id,
  p.user_id,
  c.nombre AS cliente,
  p.capital_saldo,
  p.interes_pendiente,
  p.estado,
  (
    SELECT COUNT(*)
    FROM cuotas q
    WHERE q.prestamo_id = p.id
      AND q.estado IS DISTINCT FROM 'pagada'
  ) AS cuotas_impagadas
FROM prestamos p
LEFT JOIN clientes c ON c.id = p.cliente_id
WHERE p.tipo_prestamo = 'abierto'
  AND p.estado = 'pagado'
  AND (
    COALESCE(p.interes_pendiente, 0) > 0.01
    OR EXISTS (
      SELECT 1
      FROM cuotas q
      WHERE q.prestamo_id = p.id
        AND q.estado IS DISTINCT FROM 'pagada'
    )
  )
ORDER BY p.updated_at DESC NULLS LAST;

-- 2) Reparación (idempotente)
UPDATE prestamos p
SET
  estado = 'activo',
  updated_at = NOW()
WHERE p.tipo_prestamo = 'abierto'
  AND p.estado = 'pagado'
  AND (
    COALESCE(p.interes_pendiente, 0) > 0.01
    OR EXISTS (
      SELECT 1
      FROM cuotas q
      WHERE q.prestamo_id = p.id
        AND q.estado IS DISTINCT FROM 'pagada'
    )
  );
