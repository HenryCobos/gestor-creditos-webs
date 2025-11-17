-- Script de Verificación del Sistema de Planes
-- Ejecuta estas consultas en Supabase SQL Editor para diagnosticar problemas

-- ==========================================
-- 1. VERIFICAR QUE EXISTAN LOS PLANES
-- ==========================================
SELECT 
  nombre,
  slug,
  limite_clientes,
  limite_prestamos,
  limite_usuarios,
  precio_mensual,
  precio_anual,
  activo
FROM planes
ORDER BY orden;

-- Resultado esperado: 4 planes (Gratuito, Profesional, Business, Enterprise)

-- ==========================================
-- 2. VERIFICAR ASIGNACIÓN DE PLANES A USUARIOS
-- ==========================================
SELECT 
  p.email,
  p.full_name,
  p.plan_id,
  pl.nombre as plan_nombre,
  pl.slug as plan_slug,
  p.subscription_status,
  p.created_at as fecha_registro
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC;

-- Resultado esperado: Todos los usuarios deben tener un plan_id y plan_nombre

-- ==========================================
-- 3. USUARIOS SIN PLAN ASIGNADO (PROBLEMA)
-- ==========================================
SELECT 
  email,
  full_name,
  created_at
FROM profiles
WHERE plan_id IS NULL;

-- Resultado esperado: Ningún usuario (tabla vacía)
-- Si hay usuarios aquí, ejecuta el script fix-free-plan-trigger.sql

-- ==========================================
-- 4. VERIFICAR LÍMITES DE CADA USUARIO
-- ==========================================
SELECT 
  prof.email,
  p.nombre as plan,
  p.limite_clientes,
  p.limite_prestamos,
  (SELECT COUNT(*) FROM clientes WHERE user_id = prof.id) as clientes_actuales,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = prof.id AND estado = 'activo') as prestamos_actuales
FROM profiles prof
JOIN planes p ON prof.plan_id = p.id
ORDER BY prof.created_at DESC;

-- Resultado esperado: Ver cuántos clientes y préstamos tiene cada usuario vs su límite

-- ==========================================
-- 5. USUARIOS QUE HAN SUPERADO SUS LÍMITES
-- ==========================================
SELECT 
  prof.email,
  p.nombre as plan,
  p.limite_clientes,
  (SELECT COUNT(*) FROM clientes WHERE user_id = prof.id) as clientes_actuales,
  p.limite_prestamos,
  (SELECT COUNT(*) FROM prestamos WHERE user_id = prof.id AND estado = 'activo') as prestamos_actuales,
  CASE 
    WHEN p.limite_clientes > 0 AND (SELECT COUNT(*) FROM clientes WHERE user_id = prof.id) > p.limite_clientes 
    THEN 'Excede límite de clientes'
    WHEN p.limite_prestamos > 0 AND (SELECT COUNT(*) FROM prestamos WHERE user_id = prof.id AND estado = 'activo') > p.limite_prestamos 
    THEN 'Excede límite de préstamos'
    ELSE 'OK'
  END as estado
FROM profiles prof
JOIN planes p ON prof.plan_id = p.id
WHERE 
  (p.limite_clientes > 0 AND (SELECT COUNT(*) FROM clientes WHERE user_id = prof.id) > p.limite_clientes)
  OR
  (p.limite_prestamos > 0 AND (SELECT COUNT(*) FROM prestamos WHERE user_id = prof.id AND estado = 'activo') > p.limite_prestamos);

-- Resultado esperado: Usuarios que ya crearon más recursos de los permitidos antes de aplicar las restricciones

-- ==========================================
-- 6. VERIFICAR QUE LAS FUNCIONES SQL EXISTAN
-- ==========================================
SELECT 
  proname as nombre_funcion,
  pg_get_functiondef(oid) as definicion
FROM pg_proc 
WHERE proname IN ('get_user_plan_limits', 'can_add_cliente', 'can_add_prestamo', 'handle_new_user')
ORDER BY proname;

-- Resultado esperado: 4 funciones

-- ==========================================
-- 7. VERIFICAR QUE EL TRIGGER EXISTA
-- ==========================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Resultado esperado: 1 trigger en la tabla auth.users

-- ==========================================
-- 8. PROBAR LA FUNCIÓN get_user_plan_limits
-- ==========================================
-- Reemplaza 'TU_USER_ID' con tu UUID de usuario
-- Para obtener tu user_id, ejecuta: SELECT id FROM auth.users WHERE email = 'tu@email.com';

-- SELECT * FROM get_user_plan_limits('TU_USER_ID');

-- Resultado esperado: Los límites de tu plan

-- ==========================================
-- RESUMEN DE DIAGNÓSTICO
-- ==========================================

-- Si encuentras problemas:
-- 1. Usuarios sin plan → Ejecuta fix-free-plan-trigger.sql
-- 2. Funciones no existen → Ejecuta schema-subscriptions.sql
-- 3. Planes no existen → Ejecuta schema-subscriptions.sql
-- 4. Trigger no existe → Ejecuta fix-free-plan-trigger.sql

