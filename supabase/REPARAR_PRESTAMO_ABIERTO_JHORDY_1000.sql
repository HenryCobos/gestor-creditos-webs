-- =====================================================
-- Reparar préstamo abierto 1000 / 15% (pagos parciales 50+50)
-- Usuario: jhordyeguizabalrodriguez61@gmail.com
-- prestamo_id: 24456737-7c6a-4f39-8ed0-9337798685ae
-- cuota_id:    0454317c-3de8-4c87-8503-979e306486b2
-- No modifica tabla pagos (ya suma 100).
-- =====================================================

-- PASO 1: Verificación
SELECT
  p.id AS prestamo_id,
  p.capital_saldo,
  p.interes_pendiente,
  c.id AS cuota_id,
  c.monto_cuota,
  c.monto_pagado,
  c.monto_interes,
  c.estado,
  c.periodo_desde,
  c.periodo_hasta,
  (SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos WHERE cuota_id = c.id) AS suma_pagos
FROM prestamos p
JOIN cuotas c ON c.prestamo_id = p.id
WHERE p.id = '24456737-7c6a-4f39-8ed0-9337798685ae'
  AND c.id = '0454317c-3de8-4c87-8503-979e306486b2';

-- PASO 2: Corrección
UPDATE cuotas
SET
  monto_cuota = 150,
  monto_pagado = 100,
  monto_interes = 100,
  monto_capital = 0,
  estado = 'retrasada',
  updated_at = NOW()
WHERE id = '0454317c-3de8-4c87-8503-979e306486b2'
  AND prestamo_id = '24456737-7c6a-4f39-8ed0-9337798685ae';

UPDATE prestamos
SET
  interes_pendiente = 50,
  capital_saldo = 1000,
  updated_at = NOW()
WHERE id = '24456737-7c6a-4f39-8ed0-9337798685ae';

-- PASO 3: Verificación
SELECT
  c.monto_cuota,
  c.monto_pagado,
  (c.monto_cuota - c.monto_pagado) AS pendiente_cuota,
  p.interes_pendiente,
  p.capital_saldo,
  CASE
    WHEN c.monto_cuota = 150 AND c.monto_pagado = 100
      AND (c.monto_cuota - c.monto_pagado) = 50
      AND p.interes_pendiente = 50
    THEN 'OK: 150 debido, 100 pagado, 50 pendiente'
    ELSE 'REVISAR'
  END AS resultado
FROM prestamos p
JOIN cuotas c ON c.prestamo_id = p.id
WHERE p.id = '24456737-7c6a-4f39-8ed0-9337798685ae'
  AND c.id = '0454317c-3de8-4c87-8503-979e306486b2';
