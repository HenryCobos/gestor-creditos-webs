-- =====================================================
-- AUDITORÍA (solo lectura): préstamos abiertos con posible
-- desalineación por pagos parciales (múltiples pagos vs monto_pagado)
-- Ejecutar en Supabase → SQL Editor → Export CSV
-- =====================================================

WITH pagos_por_cuota AS (
  SELECT
    cuota_id,
    COUNT(*) AS num_pagos,
    COALESCE(SUM(monto_pagado), 0)::numeric AS suma_pagos
  FROM pagos
  GROUP BY cuota_id
),
cuotas_abiertas AS (
  SELECT
    p.id AS prestamo_id,
    p.estado AS estado_prestamo,
    p.interes_pendiente,
    p.capital_saldo,
    p.monto_prestado,
    p.interes_porcentaje,
    p.fecha_inicio,
    u.email AS owner_email,
    c.id AS cuota_id,
    c.numero_cuota,
    c.monto_cuota,
    c.monto_pagado,
    c.estado AS estado_cuota,
    c.periodo_desde,
    c.periodo_hasta,
    COALESCE(pp.num_pagos, 0) AS num_pagos,
    COALESCE(pp.suma_pagos, 0) AS suma_pagos
  FROM prestamos p
  JOIN auth.users u ON u.id = p.user_id
  JOIN cuotas c ON c.prestamo_id = p.id
  LEFT JOIN pagos_por_cuota pp ON pp.cuota_id = c.id
  WHERE p.tipo_prestamo = 'abierto'
    AND p.estado = 'activo'
    AND c.estado IN ('pendiente', 'retrasada')
)
SELECT
  owner_email,
  prestamo_id,
  cuota_id,
  numero_cuota,
  monto_cuota,
  monto_pagado,
  (monto_cuota - monto_pagado) AS pendiente_fila,
  interes_pendiente AS arrastre_prestamo,
  num_pagos,
  suma_pagos,
  periodo_desde,
  periodo_hasta,
  CASE
    WHEN num_pagos > 1 AND monto_pagado + 0.01 < suma_pagos
      THEN 'REVISAR: monto_pagado menor que suma pagos'
    WHEN num_pagos >= 1 AND suma_pagos + 0.01 < monto_pagado
      THEN 'REVISAR: monto_pagado mayor que suma pagos'
    WHEN monto_pagado > 0 AND monto_cuota > monto_pagado + 500
      THEN 'REVISAR: cuota muy alta vs pagado'
    WHEN interes_pendiente > 0 AND monto_pagado = 0
      THEN 'INFO: arrastre sin pagos en cuota'
    ELSE 'OK o revisar manual'
  END AS alerta
FROM cuotas_abiertas
WHERE
  (num_pagos > 1 AND ABS(monto_pagado - suma_pagos) > 0.02)
  OR (monto_pagado > 0 AND interes_pendiente > monto_cuota)
ORDER BY alerta DESC, owner_email, prestamo_id, numero_cuota;
