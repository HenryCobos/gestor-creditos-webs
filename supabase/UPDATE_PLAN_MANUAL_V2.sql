-- =====================================================
-- ACTUALIZACION MANUAL DE PLAN (VERSION CORREGIDA)
-- Usuario: financebusinesscompany@gmail.com
-- Plan: Profesional Mensual (50 clientes + 50 préstamos)
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_plan_pro_id UUID;
  v_email TEXT := 'financebusinesscompany@gmail.com';
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ACTUALIZACION MANUAL DE PLAN';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE '============================================';
  
  -- 1. Buscar el usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No se encontró el usuario con email: %', v_email;
  END IF;
  
  RAISE NOTICE '[1] Usuario encontrado: %', v_user_id;
  
  -- 2. Verificar/obtener la organización
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '[2] Creando organización...';
    
    INSERT INTO organizations (
      owner_id,
      nombre_negocio,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'Organización de ' || v_email,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_org_id;
    
    UPDATE profiles
    SET 
      organization_id = v_org_id,
      role = 'admin',
      updated_at = NOW()
    WHERE id = v_user_id;
    
    INSERT INTO user_roles (
      user_id,
      organization_id,
      role,
      created_at
    ) VALUES (
      v_user_id,
      v_org_id,
      'admin',
      NOW()
    )
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    
    RAISE NOTICE '[2] Organización creada: %', v_org_id;
  ELSE
    RAISE NOTICE '[2] Organización existente: %', v_org_id;
  END IF;
  
  -- 3. Buscar el plan profesional
  SELECT id INTO v_plan_pro_id
  FROM planes
  WHERE slug = 'profesional'
    AND activo = true
  LIMIT 1;
  
  IF v_plan_pro_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No se encontró el plan profesional';
  END IF;
  
  RAISE NOTICE '[3] Plan profesional encontrado: %', v_plan_pro_id;
  
  -- 4. Actualizar el plan de la organización
  UPDATE organizations
  SET 
    plan_id = v_plan_pro_id,
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE id = v_org_id;
  
  RAISE NOTICE '[4] Plan de organización actualizado';
  
  -- 5. Limpiar límites individuales
  UPDATE profiles
  SET 
    limite_clientes = NULL,
    limite_prestamos = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '[5] Límites individuales limpiados';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ACTUALIZACION COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '============================================';
  
END $$;

-- Verificación final
SELECT 
  '=== RESULTADO FINAL ===' as info;

SELECT
  p.email as "📧 Email",
  p.role as "👤 Rol",
  pl.nombre as "📦 Plan",
  pl.limite_clientes as "👥 Límite Clientes",
  pl.limite_prestamos as "💰 Límite Préstamos",
  o.subscription_status as "✅ Estado",
  o.subscription_start_date as "📅 Inicio",
  o.subscription_end_date as "📅 Fin"
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';
