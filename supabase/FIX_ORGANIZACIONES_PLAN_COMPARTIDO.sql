-- =========================================================
-- FIX: SISTEMA DE ORGANIZACIONES CON PLAN COMPARTIDO
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- PROBLEMA IDENTIFICADO:
-- El trigger "on_auth_user_created" asigna automáticamente un "plan gratuito"
-- individual a cada usuario nuevo. Esto contradice el modelo de organizaciones
-- donde TODOS los usuarios de una org comparten el mismo plan del admin.
--
-- SOLUCIÓN:
-- 1. Eliminar el trigger problemático
-- 2. Limpiar plan_id de usuarios que pertenecen a organizaciones
-- 3. Solo las ORGANIZACIONES tienen plan, no los usuarios individuales
-- 4. Los usuarios consultan límites vía get_limites_organizacion()
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔧 CORRIGIENDO SISTEMA DE ORGANIZACIONES' as " ";
SELECT '========================================' as " ";

-- =========================================================
-- PASO 1: ELIMINAR TRIGGER PROBLEMÁTICO
-- =========================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

SELECT '✓ Trigger "on_auth_user_created" eliminado' as "Paso 1";

-- =========================================================
-- PASO 2: LIMPIAR plan_id DE USUARIOS EN ORGANIZACIONES
-- =========================================================

-- Los usuarios que pertenecen a una organización NO deben tener plan_id individual
-- Solo la organización tiene plan_id
UPDATE profiles
SET 
  plan_id = NULL,
  limite_clientes = NULL,
  limite_prestamos = NULL
WHERE organization_id IS NOT NULL;

SELECT '✓ plan_id limpiado de usuarios en organizaciones' as "Paso 2";

-- =========================================================
-- PASO 3: CREAR NUEVO TRIGGER (SOLO PARA USUARIOS SIN ORG)
-- =========================================================

-- Este trigger SOLO maneja usuarios que se registran sin organización
-- (usuarios que crean cuenta desde landing page)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
  new_org_id UUID;
BEGIN
  -- Obtener el ID del plan gratuito
  SELECT id INTO free_plan_id
  FROM planes
  WHERE slug = 'free'
  LIMIT 1;
  
  IF free_plan_id IS NULL THEN
    RAISE WARNING '⚠️ Plan gratuito no encontrado (slug: free)';
    RETURN NEW;
  END IF;
  
  -- CREAR UNA ORGANIZACIÓN PARA EL NUEVO USUARIO
  INSERT INTO public.organizations (
    name,
    plan_id,
    subscription_status,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
    free_plan_id,  -- La ORGANIZACIÓN tiene el plan gratuito
    'active',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_org_id;
  
  -- Crear perfil y vincularlo a la organización
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    nombre_completo,
    organization_id,  -- ✅ Usuario vinculado a org
    role,             -- ✅ Es admin de su propia org
    plan_id,          -- ❌ NULL - usa el plan de la org
    limite_clientes,  -- ❌ NULL - usa límites de la org
    limite_prestamos, -- ❌ NULL - usa límites de la org
    activo,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_org_id,  -- ✅ Vinculado a su organización
    'admin',     -- ✅ Es admin de su propia org
    NULL,        -- ❌ NO tiene plan individual
    NULL,        -- ❌ NO tiene límites individuales
    NULL,        -- ❌ NO tiene límites individuales
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    nombre_completo = EXCLUDED.nombre_completo,
    organization_id = EXCLUDED.organization_id,
    role = EXCLUDED.role,
    plan_id = NULL,           -- ❌ Limpiar plan individual si existía
    limite_clientes = NULL,   -- ❌ Limpiar límites individuales
    limite_prestamos = NULL,  -- ❌ Limpiar límites individuales
    updated_at = NOW();
  
  -- Crear registro en user_roles
  INSERT INTO public.user_roles (
    user_id,
    organization_id,
    role,
    created_at
  ) VALUES (
    NEW.id,
    new_org_id,
    'admin',
    NOW()
  )
  ON CONFLICT (user_id, organization_id) DO UPDATE
  SET role = 'admin';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

SELECT '✓ Nuevo trigger creado (crea org con plan compartido)' as "Paso 3";

-- =========================================================
-- PASO 4: VERIFICAR FUNCIÓN get_limites_organizacion()
-- =========================================================

-- Esta función DEBE existir y estar correcta
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_limites_organizacion'
  ) THEN
    RAISE NOTICE '✅ Función get_limites_organizacion() existe';
  ELSE
    RAISE EXCEPTION '❌ Función get_limites_organizacion() NO existe - ejecutar FIX_SECURITY_FINAL_CORREGIDO.sql primero';
  END IF;
END $$;

SELECT '✓ Función RPC verificada' as "Paso 4";

-- =========================================================
-- VERIFICACIÓN COMPLETA
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 VERIFICANDO RESULTADO' as " ";
SELECT '========================================' as " ";

-- Ver usuarios por organización
SELECT 
  o.name as organizacion,
  pl.nombre as plan_organizacion,
  pl.limite_clientes as limite_org_clientes,
  pl.limite_prestamos as limite_org_prestamos,
  COUNT(p.id) as total_usuarios,
  COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN p.role = 'cobrador' THEN 1 END) as cobradores,
  COUNT(p.plan_id) as usuarios_con_plan_individual
FROM organizations o
JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.name, pl.nombre, pl.limite_clientes, pl.limite_prestamos
ORDER BY o.created_at DESC;

-- Verificar que NO hay usuarios con plan individual EN organizaciones
SELECT 
  COUNT(*) as usuarios_en_org_con_plan_individual,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Correcto: Ningún usuario en org tiene plan individual'
    ELSE '❌ ERROR: Hay usuarios en org con plan individual'
  END as estado
FROM profiles
WHERE organization_id IS NOT NULL
  AND plan_id IS NOT NULL;

-- Ver trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_schema = 'auth'
  AND event_object_table = 'users';

SELECT '========================================' as " ";
SELECT '✅ CORRECCIÓN COMPLETADA' as " ";
SELECT '========================================' as " ";
SELECT '' as " ";
SELECT '📋 RESULTADO ESPERADO:' as " ";
SELECT '• usuarios_en_org_con_plan_individual = 0' as " ";
SELECT '• Cada organización debe mostrar su plan (ej: "Plan Profesional")' as " ";
SELECT '• Usuarios nuevos creados por admin NO tendrán plan individual' as " ";
SELECT '• Usuarios nuevos desde landing TENDRÁN org con plan gratuito' as " ";
SELECT '' as " ";
SELECT '🎯 MODELO CORRECTO:' as " ";
SELECT '• ORGANIZACIONES tienen plan_id → Compartido por todos' as " ";
SELECT '• USUARIOS tienen organization_id → Usan plan de la org' as " ";
SELECT '• Frontend usa get_limites_organizacion() → Límites compartidos' as " ";
SELECT '========================================' as " ";
