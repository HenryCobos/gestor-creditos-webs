-- =====================================================
-- FIX COMPLETO: Crear planes (si no existen) y asignar
-- Usuario: financebusinesscompany@gmail.com
-- =====================================================

-- PASO 1: Crear los planes si no existen
INSERT INTO planes (nombre, slug, limite_clientes, limite_prestamos, precio_mensual, precio_anual, activo, created_at, updated_at)
VALUES
  ('Gratuito', 'free', 5, 5, 0, 0, true, NOW(), NOW()),
  ('Profesional', 'profesional', 50, 50, 29.99, 299.99, true, NOW(), NOW()),
  ('Business', 'business', 200, 200, 79.99, 799.99, true, NOW(), NOW()),
  ('Enterprise', 'enterprise', 999999, 999999, 199.99, 1999.99, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  limite_clientes = EXCLUDED.limite_clientes,
  limite_prestamos = EXCLUDED.limite_prestamos,
  precio_mensual = EXCLUDED.precio_mensual,
  precio_anual = EXCLUDED.precio_anual,
  activo = EXCLUDED.activo,
  updated_at = NOW();

SELECT 'Planes creados/actualizados' as "✓ Paso 1";

-- Verificar que se crearon
SELECT id, nombre, slug, limite_clientes, limite_prestamos 
FROM planes 
WHERE slug IN ('free', 'profesional', 'business', 'enterprise')
ORDER BY limite_clientes;

-- PASO 2: Crear organización y asignar plan
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_plan_id UUID;
BEGIN
  -- Obtener user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'financebusinesscompany@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  RAISE NOTICE '✓ Usuario encontrado: %', v_user_id;
  
  -- Verificar si ya tiene organización
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = v_user_id;
  
  -- Crear organización si no existe
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
  
  -- Obtener ID del plan profesional (ahora sí debe existir)
  SELECT id INTO v_plan_id
  FROM planes
  WHERE slug = 'profesional'
  LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan profesional no encontrado (esto no debería pasar)';
  END IF;
  
  RAISE NOTICE '✓ Plan profesional: %', v_plan_id;
  
  -- Actualizar plan de la organización
  UPDATE organizations
  SET 
    plan_id = v_plan_id,
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE id = v_org_id;
  
  RAISE NOTICE '✓ Plan actualizado a Profesional';
  
  -- Limpiar límites individuales
  UPDATE profiles
  SET limite_clientes = NULL, limite_prestamos = NULL, updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✓ Límites individuales limpiados';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ACTUALIZACION COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
END $$;

-- PASO 3: Verificación Final
SELECT '========================================' as " ";
SELECT '✅ VERIFICACION FINAL' as "Estado";
SELECT '========================================' as " ";

SELECT
  p.email as "📧 Email",
  o.nombre_negocio as "🏢 Negocio",
  pl.nombre as "📦 Plan",
  pl.limite_clientes as "👥 Clientes",
  pl.limite_prestamos as "💰 Préstamos",
  o.subscription_status as "✅ Estado",
  TO_CHAR(o.subscription_start_date, 'DD/MM/YYYY') as "📅 Inicio",
  TO_CHAR(o.subscription_end_date, 'DD/MM/YYYY') as "📅 Expira"
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';
