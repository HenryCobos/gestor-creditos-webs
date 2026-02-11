-- =========================================================
-- FIX: ASIGNAR PLAN PROFESIONAL A TU ORGANIZACIÓN
-- =========================================================
-- Este script actualiza tu organización para que tenga
-- el Plan Profesional (50 clientes, 50 préstamos)
-- =========================================================

DO $$
DECLARE
  v_henry_org_id UUID;
  v_plan_profesional_id UUID;
  v_henry_email TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ASIGNANDO PLAN PROFESIONAL';
  RAISE NOTICE '========================================';
  
  -- Buscar tu email (Henry)
  SELECT email INTO v_henry_email
  FROM profiles
  WHERE email ILIKE '%henry%' OR email ILIKE '%hcobos%'
  LIMIT 1;
  
  IF v_henry_email IS NULL THEN
    RAISE EXCEPTION 'No se encontró el usuario Henry';
  END IF;
  
  RAISE NOTICE 'Usuario encontrado: %', v_henry_email;
  
  -- Buscar tu organización
  SELECT organization_id INTO v_henry_org_id
  FROM profiles
  WHERE email = v_henry_email;
  
  IF v_henry_org_id IS NULL THEN
    RAISE EXCEPTION 'Usuario % no tiene organización', v_henry_email;
  END IF;
  
  RAISE NOTICE 'Organización ID: %', v_henry_org_id;
  
  -- Buscar el plan profesional
  SELECT id INTO v_plan_profesional_id
  FROM planes
  WHERE slug IN ('pro', 'profesional')
  ORDER BY limite_clientes DESC
  LIMIT 1;
  
  IF v_plan_profesional_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el plan profesional';
  END IF;
  
  RAISE NOTICE 'Plan Profesional ID: %', v_plan_profesional_id;
  
  -- Actualizar la organización con el plan profesional
  UPDATE organizations
  SET 
    plan_id = v_plan_profesional_id,
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = v_henry_org_id;
  
  RAISE NOTICE '✅ Organización actualizada con Plan Profesional';
  
  -- Asegurarse de que NO tengas plan individual
  UPDATE profiles
  SET 
    plan_id = NULL,
    limite_clientes = NULL,
    limite_prestamos = NULL,
    updated_at = NOW()
  WHERE organization_id = v_henry_org_id;
  
  RAISE NOTICE '✅ Planes individuales removidos de usuarios';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '========================================';
END $$;

-- Verificar el resultado
SELECT 
  'RESULTADO:' as info,
  o.nombre_negocio,
  pl.nombre as plan,
  pl.limite_clientes,
  pl.limite_prestamos,
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id) as usuarios
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE o.id IN (
  SELECT organization_id FROM profiles WHERE email ILIKE '%henry%'
);

-- Ver recursos actuales
SELECT 
  'RECURSOS ACTUALES:' as info,
  (SELECT COUNT(*) 
   FROM clientes c 
   JOIN profiles p ON p.id = c.user_id 
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email ILIKE '%henry%' LIMIT 1)
  ) as clientes_totales,
  (SELECT COUNT(*) 
   FROM prestamos pr 
   JOIN profiles p ON p.id = pr.user_id 
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE email ILIKE '%henry%' LIMIT 1)
  ) as prestamos_totales;
