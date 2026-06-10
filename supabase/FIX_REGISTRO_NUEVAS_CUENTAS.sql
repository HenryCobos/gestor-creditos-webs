-- =====================================================
-- FIX: "Database error saving new user" al crear cuenta
-- =====================================================
-- Ejecutar TODO este script en Supabase → SQL Editor → Run
-- Soluciona el error al registrarse desde "Crear Cuenta".
-- =====================================================

-- 1) Eliminar trigger existente (cualquier versión anterior)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2) Eliminar funciones que puedan estar asociadas
DROP FUNCTION IF EXISTS public.handle_new_user_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3) Función que crea organización + perfil + rol para cada nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
  v_new_org_id UUID;
  v_invited_org_id TEXT;  -- organization_id pasado por API cuando un admin invita
  v_invited_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Nombre para org y perfil
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Si un admin creó este usuario, viene organization_id en metadata (no crear nueva org)
  v_invited_org_id := NEW.raw_user_meta_data->>'organization_id';
  v_invited_role := NEW.raw_user_meta_data->>'role';
  IF v_invited_role IS NULL OR v_invited_role NOT IN ('admin', 'cobrador') THEN
    v_invited_role := 'cobrador';
  END IF;
  IF v_invited_org_id IS NOT NULL AND v_invited_org_id ~ '^[0-9a-fA-F-]{36}$' THEN
    -- Solo crear perfil y user_roles con la org indicada (la API puede sobrescribir rol)
    INSERT INTO public.profiles (
      id, email, full_name, nombre_completo, organization_id, role, activo, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.email, v_full_name, v_full_name, v_invited_org_id::UUID, v_invited_role, true, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      nombre_completo = EXCLUDED.nombre_completo,
      updated_at = NOW();
    INSERT INTO public.user_roles (user_id, organization_id, role, created_at, updated_at)
    VALUES (NEW.id, v_invited_org_id::UUID, v_invited_role, NOW(), NOW())
    ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW();
    RETURN NEW;
  END IF;

  -- Plan gratuito (puede ser NULL si no existe la tabla/plan)
  SELECT id INTO v_free_plan_id
  FROM public.planes
  WHERE slug = 'free' AND activo = true
  LIMIT 1;

  -- Crear organización para el nuevo usuario
  INSERT INTO public.organizations (
    owner_id,
    nombre_negocio,
    plan_id,
    subscription_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_full_name || '''s Organization',
    v_free_plan_id,
    'active',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_org_id;

  -- Crear perfil vinculado a la organización
  INSERT INTO public.profiles (
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
    v_full_name,
    v_full_name,
    v_new_org_id,
    'admin',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    nombre_completo = COALESCE(public.profiles.nombre_completo, EXCLUDED.nombre_completo),
    updated_at = NOW();

  -- Asignar rol en user_roles
  INSERT INTO public.user_roles (user_id, organization_id, role, created_at, updated_at)
  VALUES (NEW.id, v_new_org_id, 'admin', NOW(), NOW())
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user_signup] Error para %: %', NEW.email, SQLERRM;
    RAISE;
END;
$$;

-- 4) Crear el trigger en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

-- 5) Verificación
SELECT
  'Trigger instalado correctamente' AS estado,
  tgname AS trigger_name,
  tgrelid::regclass AS tabla
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'
  AND tgrelid = 'auth.users'::regclass;
