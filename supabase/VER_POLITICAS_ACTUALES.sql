-- =====================================================
-- VER POLÍTICAS RLS ACTUALES
-- =====================================================

-- Ver todas las políticas activas en las tablas core
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
ORDER BY tablename, policyname;

-- Verificar si RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
ORDER BY tablename;

-- Test directo sin RLS (como superusuario)
SELECT 
  'Test datos crudos:' as test,
  (SELECT COUNT(*) FROM clientes WHERE user_id = auth.uid()) as mis_clientes,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = auth.uid()) as mis_prestamos,
  auth.uid() as mi_user_id;
