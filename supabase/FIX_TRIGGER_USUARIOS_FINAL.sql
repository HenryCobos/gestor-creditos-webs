-- =========================================================
-- FIX DEFINITIVO: Trigger correcto para nuevos usuarios
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- PROBLEMA:
-- El trigger handle_new_user_signup() crea una organización para TODOS
-- los usuarios nuevos, incluso los que un admin crea desde /dashboard/usuarios
-- 
-- SOLUCIÓN:
-- El trigger debe:
-- 1. Crear org SOLO para usuarios sin organization_id (landing page)
-- 2. NO tocar usuarios que ya tienen organization_id (creados por admin)
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔧 CORRIGIENDO TRIGGER DE NUEVOS USUARIOS' as " ";
SELECT '========================================' as " ";

-- Eliminar trigger y función antiguos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup() CASCADE;

SELECT '✓ Trigger antiguo eliminado' as " ";

-- Crear función corregida
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id UUID;
  v_new_org_id UUID;
  v_existing_profile RECORD;
BEGIN
  -- Esperar un momento para que la API pueda crear el perfil primero
  PERFORM pg_sleep(0.5);
  
  -- Verificar si ya existe un perfil para este usuario
  SELECT id, organization_id INTO v_existing_profile
  FROM profiles
  WHERE id = NEW.id;
  
  -- Si el perfil ya existe Y ya tiene organization_id, NO hacer nada
  -- (significa que fue creado por un admin vía API)
  IF v_existing_profile.id IS NOT NULL AND v_existing_profile.organization_id IS NOT NULL THEN
    RAISE NOTICE '[TRIGGER] Usuario % ya tiene organización, no se crea nueva', NEW.email;
    RETURN NEW;
  END IF;
  
  -- Si llegamos aquí, es un usuario de landing page sin organización
  RAISE NOTICE '[TRIGGER] Usuario % es nuevo desde landing, creando organización', NEW.email;
  
  -- Obtener plan gratuito
  SELECT id INTO v_free_plan_id FROM planes WHERE slug = 'free' LIMIT 1;
  
  IF v_free_plan_id IS NULL THEN
    RAISE WARNING '[TRIGGER] Plan gratuito no encontrado';
    -- Aún así creamos el perfil sin plan
  END IF;
  
  -- Crear organización para el nuevo usuario
  INSERT INTO organizations (
    owner_id,
    nombre_negocio,
    plan_id,
    subscription_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
    v_free_plan_id,
    'active',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_org_id;
  
  -- Crear o actualizar perfil
  INSERT INTO profiles (
    id,
    email,
    full_name,
    nombre_completo,
    organization_id,
    role,
    activo,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_new_org_id,
    'admin',
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = COALESCE(profiles.organization_id, EXCLUDED.organization_id),
    role = COALESCE(profiles.role, EXCLUDED.role),
    updated_at = NOW();
  
  -- Crear user_role
  INSERT INTO user_roles (user_id, organization_id, role, created_at)
  VALUES (NEW.id, v_new_org_id, 'admin', NOW())
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  RAISE NOTICE '[TRIGGER] Organización creada para: %', NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

SELECT '✓ Trigger corregido recreado' as " ";

SELECT '========================================' as " ";
SELECT '✅ TRIGGER CORREGIDO' as " ";
SELECT '========================================' as " ";
SELECT '' as " ";
SELECT '🎯 COMPORTAMIENTO AHORA:' as " ";
SELECT '' as " ";
SELECT '1. USUARIO SE REGISTRA DESDE LANDING:' as " ";
SELECT '   → Trigger crea su PROPIA organización' as " ";
SELECT '   → Usuario es admin de su org' as " ";
SELECT '   → Org tiene plan gratuito' as " ";
SELECT '' as " ";
SELECT '2. ADMIN CREA USUARIO DESDE /dashboard/usuarios:' as " ";
SELECT '   → API asigna organization_id del admin' as " ";
SELECT '   → Trigger detecta que ya tiene org' as " ";
SELECT '   → Trigger NO crea nueva org' as " ";
SELECT '   → Usuario queda en la org del admin' as " ";
SELECT '' as " ";
SELECT '========================================' as " ";
SELECT '📋 SIGUIENTE PASO:' as " ";
SELECT 'Ejecuta el script MOVER_USUARIOS_A_ORG_HENRY.sql' as " ";
SELECT 'para corregir los usuarios ya creados incorrectamente' as " ";
SELECT '========================================' as " ";
