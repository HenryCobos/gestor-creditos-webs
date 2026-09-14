-- Ejecutar en Supabase SQL Editor (PRODUCCIÓN) antes del deploy de fluidez/caja.
-- Solo lectura excepto si el paso 3 falla → entonces MIGRACION_PRESTAMO_ABIERTO_RPC_FIX.sql

-- 1) ¿Existe la función?
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'get_prestamos_segun_rol';

-- 2) ¿Columna producto_id?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prestamos'
  AND column_name = 'producto_id';

-- 3) ¿RPC responde? (debe devolver filas o vacío, NO error)
SELECT * FROM get_prestamos_segun_rol() LIMIT 1;

-- Si el paso 3 falla con "producto_id does not exist" u otro error de columna:
--   → supabase/MIGRACION_PRESTAMO_ABIERTO_RPC_FIX.sql (idempotente)
-- Si usáis préstamo abierto y aún no migraste periodos:
--   → supabase/MIGRACION_PRESTAMO_ABIERTO_PERIODOS.sql (solo una vez)
