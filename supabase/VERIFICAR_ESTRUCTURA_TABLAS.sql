-- =====================================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- =====================================================

-- Ver todas las columnas de la tabla clientes
SELECT '============ COLUMNAS DE CLIENTES ============' as seccion;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clientes'
ORDER BY ordinal_position;

-- Ver todas las columnas de la tabla prestamos
SELECT '============ COLUMNAS DE PRESTAMOS ============' as seccion;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prestamos'
ORDER BY ordinal_position;

-- Ver todas las columnas de la tabla cuotas
SELECT '============ COLUMNAS DE CUOTAS ============' as seccion;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cuotas'
ORDER BY ordinal_position;
