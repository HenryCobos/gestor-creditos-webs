-- =====================================================
-- DIAGNÓSTICO COMPLETO URGENTE
-- =====================================================

-- 1. Verificar tu sesión
SELECT '============ 1. TU SESIÓN ============' as seccion;

SELECT 
  auth.uid() as mi_user_id,
  auth.jwt() ->> 'email' as mi_email,
  current_user as postgres_user;

-- 2. Verificar tu perfil
SELECT '============ 2. TU PERFIL ============' as seccion;

SELECT * FROM profiles WHERE id = auth.uid();

-- 3. Contar tus datos (SIN políticas RLS, forzando acceso)
SELECT '============ 3. CONTEO DE TUS DATOS ============' as seccion;

SELECT 
  (SELECT COUNT(*) FROM clientes WHERE user_id = auth.uid()) as mis_clientes,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = auth.uid()) as mis_prestamos,
  (SELECT COUNT(*) FROM cuotas WHERE prestamo_id IN (SELECT id FROM prestamos WHERE user_id = auth.uid())) as mis_cuotas,
  (SELECT COUNT(*) FROM pagos WHERE prestamo_id IN (SELECT id FROM prestamos WHERE user_id = auth.uid())) as mis_pagos;

-- 4. Ver políticas actuales
SELECT '============ 4. POLÍTICAS RLS ACTUALES ============' as seccion;

SELECT 
  tablename,
  policyname,
  cmd as operacion,
  CASE 
    WHEN qual IS NOT NULL THEN 'Tiene USING'
    ELSE 'Sin USING'
  END as tiene_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Tiene WITH CHECK'
    ELSE 'Sin WITH CHECK'
  END as tiene_with_check
FROM pg_policies
WHERE tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
ORDER BY tablename, policyname;

-- 5. Test simple de acceso
SELECT '============ 5. TEST ACCESO SIMPLE ============' as seccion;

-- Test directo: ¿Puedo ver mis clientes?
SELECT 
  COUNT(*) as clientes_visibles
FROM clientes
WHERE user_id = auth.uid();

-- 6. Verificar si RLS está habilitado
SELECT '============ 6. ESTADO RLS ============' as seccion;

SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'prestamos', 'cuotas', 'pagos')
ORDER BY tablename;

-- 7. Sample de un cliente tuyo (para debug)
SELECT '============ 7. SAMPLE CLIENTE ============' as seccion;

SELECT 
  id,
  nombre,
  user_id,
  user_id = auth.uid() as "es_mio",
  auth.uid() as "mi_auth_uid"
FROM clientes
WHERE user_id = auth.uid()
LIMIT 1;

-- 8. RESULTADO FINAL
SELECT '============ 8. DIAGNÓSTICO ============' as seccion;

WITH datos AS (
  SELECT 
    (SELECT COUNT(*) FROM clientes WHERE user_id = auth.uid()) as clientes,
    (SELECT COUNT(*) FROM prestamos WHERE user_id = auth.uid()) as prestamos
)
SELECT 
  clientes,
  prestamos,
  CASE 
    WHEN clientes > 0 AND prestamos > 0 THEN '✅ Tienes datos - El problema es en las políticas RLS'
    WHEN clientes = 0 AND prestamos = 0 THEN '⚠️ No tienes datos O las políticas están bloqueando TODO'
    ELSE '⚠️ Datos inconsistentes'
  END as diagnostico
FROM datos;
