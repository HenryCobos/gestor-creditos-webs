-- =====================================================
-- ASIGNAR PLAN PROFESIONAL (usando plan existente)
-- Usuario: financebusinesscompany@gmail.com
-- Plan: Profesional (slug = 'pro')
-- =====================================================

-- NOTA: Los planes YA EXISTEN en tu base de datos
-- Solo necesitamos asignar el plan 'pro' al usuario

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_plan_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ASIGNACION DE PLAN PROFESIONAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE ' ';
  
  -- 1. Obtener user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'financebusinesscompany@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  RAISE NOTICE '[1] Usuario encontrado: %', v_user_id;
  
  -- 2. Verificar si ya tiene organización
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = v_user_id;
  
  -- 3. Crear organización si no existe
  IF v_org_id IS NULL THEN
    RAISE NOTICE '[2] Creando organización...';
    
    INSERT INTO organizations (owner_id, nombre_negocio, created_at, updated_at)
    VALUES (v_user_id, 'Finance Business Company', NOW(), NOW())
    RETURNING id INTO v_org_id;
    
    RAISE NOTICE '[2] Organización creada: %', v_org_id;
    
    -- Actualizar perfil
    UPDATE profiles
    SET 
      organization_id = v_org_id, 
      role = 'admin', 
      updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Crear user_role
    INSERT INTO user_roles (user_id, organization_id, role, created_at)
    VALUES (v_user_id, v_org_id, 'admin', NOW())
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    
    RAISE NOTICE '[2] Perfil y rol actualizados';
  ELSE
    RAISE NOTICE '[2] Organización existente: %', v_org_id;
  END IF;
  
  -- 4. Obtener ID del plan 'pro' (el que YA EXISTE en tu BD)
  SELECT id INTO v_plan_id
  FROM planes
  WHERE slug = 'pro'
  LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan profesional (slug=pro) no encontrado';
  END IF;
  
  RAISE NOTICE '[3] Plan Profesional encontrado: %', v_plan_id;
  
  -- 5. Actualizar plan de la organización
  UPDATE organizations
  SET 
    plan_id = v_plan_id,
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE id = v_org_id;
  
  RAISE NOTICE '[4] Plan Profesional asignado a la organización';
  
  -- 6. Limpiar límites individuales (ahora usa límites de organización)
  UPDATE profiles
  SET 
    limite_clientes = NULL, 
    limite_prestamos = NULL, 
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '[5] Límites individuales limpiados';
  RAISE NOTICE ' ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ASIGNACION COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
END $$;

-- Verificación Final
SELECT ' ' as " ";
SELECT '========================================' as " ";
SELECT '✅ VERIFICACION FINAL' as " ";
SELECT '========================================' as " ";

SELECT
  p.email as "📧 Email",
  p.role as "👤 Rol",
  o.nombre_negocio as "🏢 Negocio",
  pl.nombre as "📦 Plan",
  pl.slug as "🔖 Slug",
  CASE 
    WHEN pl.limite_clientes IS NOT NULL THEN pl.limite_clientes::text
    ELSE 'Ilimitado'
  END as "👥 Límite Clientes",
  CASE 
    WHEN pl.limite_prestamos IS NOT NULL THEN pl.limite_prestamos::text
    ELSE 'Ilimitado'
  END as "💰 Límite Préstamos",
  o.subscription_status as "✅ Estado",
  TO_CHAR(o.subscription_start_date, 'DD/MM/YYYY') as "📅 Inicio",
  TO_CHAR(o.subscription_end_date, 'DD/MM/YYYY') as "📅 Expira"
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';

SELECT ' ' as " ";
SELECT '========================================' as " ";
SELECT '📝 SIGUIENTE PASO' as " ";
SELECT '========================================' as " ";
SELECT 'Notifica al usuario:' as " ";
SELECT '1️⃣ Cerrar sesión en la aplicación' as " ";
SELECT '2️⃣ Volver a iniciar sesión' as " ";
SELECT '3️⃣ Verificar que vea "Plan Profesional"' as " ";
SELECT '4️⃣ Ya puede usar todos los límites del plan' as " ";
