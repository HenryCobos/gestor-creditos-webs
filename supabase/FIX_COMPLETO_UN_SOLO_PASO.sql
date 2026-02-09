-- =====================================================
-- FIX COMPLETO EN UN SOLO PASO
-- Usuario: financebusinesscompany@gmail.com
-- Plan: Profesional (50 clientes + 50 préstamos)
-- =====================================================

-- Este script hace TODO automáticamente:
-- 1. Crea la organización (si no existe)
-- 2. Asigna la organización al usuario
-- 3. Actualiza el plan a Profesional
-- 4. Limpia límites individuales

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_plan_id UUID;
BEGIN
  -- 1. Obtener user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'financebusinesscompany@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  RAISE NOTICE '✓ Usuario encontrado: %', v_user_id;
  
  -- 2. Verificar si ya tiene organización
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = v_user_id;
  
  -- 3. Crear organización si no existe
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (owner_id, nombre_negocio, created_at, updated_at)
    VALUES (v_user_id, 'Finance Business Company', NOW(), NOW())
    RETURNING id INTO v_org_id;
    
    RAISE NOTICE '✓ Organización creada: %', v_org_id;
    
    -- Actualizar perfil
    UPDATE profiles
    SET organization_id = v_org_id, role = 'admin', updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Crear user_role
    INSERT INTO user_roles (user_id, organization_id, role, created_at)
    VALUES (v_user_id, v_org_id, 'admin', NOW())
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE NOTICE '✓ Organización existente: %', v_org_id;
  END IF;
  
  -- 4. Obtener ID del plan profesional
  SELECT id INTO v_plan_id
  FROM planes
  WHERE slug = 'profesional' AND activo = true
  LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan profesional no encontrado';
  END IF;
  
  RAISE NOTICE '✓ Plan profesional: %', v_plan_id;
  
  -- 5. Actualizar plan de la organización
  UPDATE organizations
  SET 
    plan_id = v_plan_id,
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE id = v_org_id;
  
  RAISE NOTICE '✓ Plan actualizado';
  
  -- 6. Limpiar límites individuales
  UPDATE profiles
  SET limite_clientes = NULL, limite_prestamos = NULL, updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✓ Límites limpiados';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ACTUALIZACION COMPLETADA';
  RAISE NOTICE '========================================';
END $$;

-- Verificación
SELECT
  p.email as "Email",
  o.nombre_negocio as "Negocio",
  pl.nombre as "Plan",
  pl.limite_clientes as "Clientes",
  pl.limite_prestamos as "Préstamos",
  o.subscription_status as "Estado",
  TO_CHAR(o.subscription_end_date, 'DD/MM/YYYY') as "Expira"
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';
