-- =====================================================
-- ACTUALIZAR PLAN MANUALMENTE
-- Usuario: financebusinesscompany@gmail.com
-- Plan: Profesional Mensual (50 clientes + 50 préstamos)
-- Fecha: 07/02/2026
-- =====================================================

-- PASO 1: Verificar que el usuario existe y obtener su información
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_plan_pro_id UUID;
  v_email TEXT := 'financebusinesscompany@gmail.com';
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ACTUALIZACION MANUAL DE PLAN';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  
  -- 1. Buscar el usuario en auth.users
  RAISE NOTICE '[1/6] Buscando usuario por email: %', v_email;
  
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No se encontró el usuario con email: %', v_email;
  END IF;
  
  RAISE NOTICE '✓ Usuario encontrado: %', v_user_id;
  RAISE NOTICE '';
  
  -- 2. Verificar/obtener la organización del usuario
  RAISE NOTICE '[2/6] Verificando organización del usuario...';
  
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '⚠ Usuario no tiene organización asignada. Creando...';
    
    -- Crear organización para el usuario
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
    
    -- Actualizar el perfil con la organización
    UPDATE profiles
    SET 
      organization_id = v_org_id,
      role = 'admin',
      updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Crear entrada en user_roles
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
    
    RAISE NOTICE '✓ Organización creada: %', v_org_id;
  ELSE
    RAISE NOTICE '✓ Organización existente: %', v_org_id;
  END IF;
  RAISE NOTICE '';
  
  -- 3. Buscar el plan profesional
  RAISE NOTICE '[3/6] Buscando plan Profesional Mensual...';
  
  SELECT id INTO v_plan_pro_id
  FROM planes
  WHERE slug = 'profesional'
    AND activo = true
  LIMIT 1;
  
  IF v_plan_pro_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No se encontró el plan profesional en la base de datos';
  END IF;
  
  RAISE NOTICE '✓ Plan encontrado: %', v_plan_pro_id;
  RAISE NOTICE '  - Slug: profesional';
  RAISE NOTICE '  - Límites: 50 clientes, 50 préstamos';
  RAISE NOTICE '';
  
  -- 4. Actualizar el plan de la organización
  RAISE NOTICE '[4/6] Actualizando plan de la organización...';
  
  UPDATE organizations
  SET 
    plan_id = v_plan_pro_id,
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE id = v_org_id;
  
  RAISE NOTICE '✓ Plan actualizado exitosamente';
  RAISE NOTICE '  - Estado: active';
  RAISE NOTICE '  - Inicio: %', NOW();
  RAISE NOTICE '  - Fin: %', NOW() + INTERVAL '30 days';
  RAISE NOTICE '';
  
  -- 5. Limpiar límites individuales del usuario (si existen)
  RAISE NOTICE '[5/6] Limpiando límites individuales del perfil...';
  
  UPDATE profiles
  SET 
    limite_clientes = NULL,
    limite_prestamos = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✓ Límites individuales removidos (ahora usa límites de organización)';
  RAISE NOTICE '';
  
  -- 6. Verificar resultado final
  RAISE NOTICE '[6/6] Verificando configuración final...';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESUMEN DE ACTUALIZACION';
  RAISE NOTICE '============================================';
  
  -- Mostrar información completa
  PERFORM 
    RAISE NOTICE 'Email: %', p.email,
    RAISE NOTICE 'Usuario ID: %', p.id,
    RAISE NOTICE 'Organización ID: %', p.organization_id,
    RAISE NOTICE 'Rol: %', p.role,
    RAISE NOTICE 'Plan: %', pl.nombre,
    RAISE NOTICE 'Plan Slug: %', pl.slug,
    RAISE NOTICE 'Límite Clientes: %', pl.limite_clientes,
    RAISE NOTICE 'Límite Préstamos: %', pl.limite_prestamos,
    RAISE NOTICE 'Estado Suscripción: %', o.subscription_status,
    RAISE NOTICE 'Fecha Inicio: %', o.subscription_start_date,
    RAISE NOTICE 'Fecha Fin: %', o.subscription_end_date
  FROM profiles p
  JOIN organizations o ON o.id = p.organization_id
  JOIN planes pl ON pl.id = o.plan_id
  WHERE p.id = v_user_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ACTUALIZACION COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '============================================';
  
END $$;

-- =====================================================
-- VERIFICACION FINAL
-- =====================================================

-- Query para verificar que todo esté correcto
SELECT 
  '=== VERIFICACION FINAL ===' as titulo;

SELECT
  p.email as "Email",
  p.id as "User ID",
  p.organization_id as "Organization ID",
  p.role as "Rol",
  o.nombre_negocio as "Nombre Negocio",
  pl.nombre as "Plan",
  pl.slug as "Plan Slug",
  pl.limite_clientes as "Límite Clientes",
  pl.limite_prestamos as "Límite Préstamos",
  o.subscription_status as "Estado",
  o.subscription_start_date as "Inicio Suscripción",
  o.subscription_end_date as "Fin Suscripción",
  p.limite_clientes as "Límite Individual Clientes (debe ser NULL)",
  p.limite_prestamos as "Límite Individual Préstamos (debe ser NULL)"
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';

-- Verificar uso actual
SELECT 
  '=== USO ACTUAL ===' as titulo;

SELECT 
  (SELECT COUNT(*) FROM clientes c 
   JOIN profiles p ON p.id = c.user_id 
   WHERE p.email = 'financebusinesscompany@gmail.com') as "Clientes Actuales",
  (SELECT COUNT(*) FROM prestamos pr
   JOIN clientes c ON c.id = pr.cliente_id
   JOIN profiles p ON p.id = c.user_id
   WHERE p.email = 'financebusinesscompany@gmail.com') as "Préstamos Actuales";

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

/*

📋 INSTRUCCIONES:

1. Copia todo este script
2. Ve a Supabase → SQL Editor
3. Pega el script completo
4. Haz clic en "Run"

El script hará lo siguiente:

✅ Paso 1: Buscar el usuario por email
✅ Paso 2: Verificar/crear su organización (si no tiene)
✅ Paso 3: Buscar el plan profesional en la base de datos
✅ Paso 4: Actualizar el plan de la organización
✅ Paso 5: Limpiar límites individuales (ahora usa los de organización)
✅ Paso 6: Mostrar resumen completo

El script es SEGURO porque:
- Solo actualiza si encuentra el usuario
- No elimina datos
- Muestra logs detallados de cada paso
- Verifica el resultado final

RESULTADO ESPERADO:

Email: financebusinesscompany@gmail.com
Plan: Profesional
Límite Clientes: 50
Límite Préstamos: 50
Estado: active
Fecha Inicio: 2026-02-07 (hoy)
Fecha Fin: 2026-03-09 (30 días después)

*/
