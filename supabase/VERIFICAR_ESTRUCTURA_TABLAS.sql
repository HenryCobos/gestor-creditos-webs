-- =====================================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- Para identificar los nombres correctos de las columnas
-- =====================================================

-- TABLA: rutas
SELECT 
  '=== ESTRUCTURA DE TABLA: rutas ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rutas'
ORDER BY ordinal_position;

SELECT ' ' as " ";

-- TABLA: prestamos
SELECT 
  '=== ESTRUCTURA DE TABLA: prestamos ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prestamos'
ORDER BY ordinal_position;

SELECT ' ' as " ";

-- TABLA: pagos
SELECT 
  '=== ESTRUCTURA DE TABLA: pagos ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pagos'
ORDER BY ordinal_position;

SELECT ' ' as " ";

-- TABLA: gastos
SELECT 
  '=== ESTRUCTURA DE TABLA: gastos ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gastos'
ORDER BY ordinal_position;
