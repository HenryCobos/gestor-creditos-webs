-- =====================================================
-- Diagnóstico / reparación: cuotas "pagadas" sin pagos
-- (estado huérfano tras desmarcar fallido o cascada)
-- SOLO LECTURA por defecto. Descomenta el UPDATE al final
-- tras revisar el SELECT.
-- =====================================================

-- 1) Cuotas pagadas SIN filas en pagos para esa cuota_id
SELECT
  c.id AS cuota_id,
  c.numero_cuota,
  c.monto_cuota,
  c.monto_pagado,
  c.estado,
  c.fecha_vencimiento,
  p.id AS prestamo_id,
  cl.nombre AS cliente,
  (
    SELECT COUNT(*) FROM pagos pg WHERE pg.cuota_id = c.id
  ) AS pagos_directos,
  (
    SELECT COUNT(*)
    FROM pagos pg
    WHERE pg.prestamo_id = c.prestamo_id
      AND pg.notas LIKE '%"cuota_id":"' || c.id || '"%'
  ) AS pagos_cascada_que_mencionan
FROM cuotas c
JOIN prestamos p ON p.id = c.prestamo_id
LEFT JOIN clientes cl ON cl.id = p.cliente_id
WHERE c.estado = 'pagada'
  AND COALESCE(c.monto_pagado, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.cuota_id = c.id)
ORDER BY cl.nombre, c.numero_cuota;

-- 2) Caso Dany (ajustar nombre si hace falta) — solo diagnóstico
-- SELECT c.*, p.id AS prestamo_id
-- FROM cuotas c
-- JOIN prestamos p ON p.id = c.prestamo_id
-- JOIN clientes cl ON cl.id = p.cliente_id
-- WHERE cl.nombre ILIKE '%Dany%Sánchez%'
-- ORDER BY c.numero_cuota;

-- 3) REPARACIÓN OPCIONAL (descomentar y acotar por cuota_id o prestamo_id)
-- ATENCIÓN: deja monto_pagado=0. Si había pago en cascada en otra cuota,
-- preferible desmarcar desde la app tras el fix de código (ajusta el pago).
--
-- UPDATE cuotas c
-- SET
--   monto_pagado = 0,
--   estado = CASE
--     WHEN c.fecha_vencimiento::date < CURRENT_DATE THEN 'retrasada'
--     ELSE 'pendiente'
--   END,
--   fecha_pago = NULL
-- WHERE c.id IN (
--   -- Pegar UUID(s) de cuota del SELECT 1
--   '00000000-0000-0000-0000-000000000000'
-- )
-- RETURNING id, numero_cuota, monto_pagado, estado;
--
-- Luego, si el préstamo tiene ruta:
-- SELECT recalcular_capital_ruta(ruta_id)
-- FROM prestamos WHERE id = '<prestamo_id>';

-- =====================================================
-- 4) Diagnóstico caja: pagos vs cuotas (excedente en pagos)
-- Ejecutar tras desmarcar huérfano cuando la caja no bajó.
-- =====================================================

-- 4a) Préstamos con SUM(pagos) > SUM(cuotas.monto_pagado)
SELECT
  p.id AS prestamo_id,
  cl.nombre AS cliente,
  r.nombre_ruta,
  r.id AS ruta_id,
  COALESCE((
    SELECT SUM(pg.monto_pagado) FROM pagos pg WHERE pg.prestamo_id = p.id
  ), 0) AS total_pagos,
  COALESCE((
    SELECT SUM(c.monto_pagado) FROM cuotas c WHERE c.prestamo_id = p.id
  ), 0) AS total_cuotas_pagado,
  COALESCE((
    SELECT SUM(pg.monto_pagado) FROM pagos pg WHERE pg.prestamo_id = p.id
  ), 0) - COALESCE((
    SELECT SUM(c.monto_pagado) FROM cuotas c WHERE c.prestamo_id = p.id
  ), 0) AS excedente_pagos
FROM prestamos p
JOIN clientes cl ON cl.id = p.cliente_id
LEFT JOIN rutas r ON r.id = p.ruta_id
WHERE COALESCE((
    SELECT SUM(pg.monto_pagado) FROM pagos pg WHERE pg.prestamo_id = p.id
  ), 0) - COALESCE((
    SELECT SUM(c.monto_pagado) FROM cuotas c WHERE c.prestamo_id = p.id
  ), 0) > 0.01
ORDER BY excedente_pagos DESC;

-- 4b) Caso Dany Sánchez — pagos detallados
SELECT
  pg.id AS pago_id,
  pg.cuota_id,
  c.numero_cuota,
  pg.monto_pagado,
  pg.metodo_pago,
  pg.fecha_pago,
  pg.notas,
  p.id AS prestamo_id,
  r.nombre_ruta,
  r.id AS ruta_id
FROM pagos pg
JOIN prestamos p ON p.id = pg.prestamo_id
JOIN clientes cl ON cl.id = p.cliente_id
LEFT JOIN cuotas c ON c.id = pg.cuota_id
LEFT JOIN rutas r ON r.id = p.ruta_id
WHERE cl.nombre ILIKE '%Dany%Sánchez%'
ORDER BY pg.fecha_pago DESC, c.numero_cuota;

-- 4c) Cuotas Dany vs total pagos
SELECT
  c.numero_cuota,
  c.monto_cuota,
  c.monto_pagado,
  c.estado,
  c.fecha_pago,
  p.id AS prestamo_id
FROM cuotas c
JOIN prestamos p ON p.id = c.prestamo_id
JOIN clientes cl ON cl.id = p.cliente_id
WHERE cl.nombre ILIKE '%Dany%Sánchez%'
ORDER BY c.numero_cuota;

-- 4d) REPARACIÓN CAJA Dany / ANITA (descomentar tras revisar 4b)
-- Si hay excedente ~650: eliminar el pago sobrante (duplicado o huérfano).
--
-- DELETE FROM pagos
-- WHERE id IN (
--   -- Pegar UUID del pago sobrante del SELECT 4b (el más reciente duplicado)
--   '00000000-0000-0000-0000-000000000000'
-- )
-- RETURNING id, monto_pagado, cuota_id;
--
-- Recalcular caja ANITA (pegar ruta_id del SELECT 4b):
-- SELECT recalcular_capital_ruta('00000000-0000-0000-0000-000000000000'::uuid) AS capital_anita;
--
-- Verificar capital ANITA:
-- SELECT nombre_ruta, capital_actual FROM rutas WHERE nombre_ruta ILIKE '%ANITA%';
