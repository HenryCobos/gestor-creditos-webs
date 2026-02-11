-- =========================================================
-- SOLUCIÓN DEFINITIVA: Mover todos los cobradores a la org de Henry
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- Problema identificado:
-- - Henry tiene su propia organización con "Plan Profesional"
-- - Valeria y otros usuarios están en organizaciones diferentes con "Plan Gratuito"
-- 
-- Solución:
-- - Mover TODOS los usuarios a la organización de Henry
-- - Solo Henry debe ser admin, los demás cobradores
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔧 MOVIENDO USUARIOS A ORGANIZACIÓN DE HENRY' as " ";
SELECT '========================================' as " ";

-- PASO 1: Identificar la organización de Henry
DO $$
DECLARE
  v_henry_org_id UUID;
  v_henry_email TEXT := 'hcobos99@gmail.com'; -- 🔴 CAMBIA ESTO si tu email es diferente
  v_usuarios_movidos INTEGER := 0;
BEGIN
  -- Buscar la organización de Henry
  SELECT organization_id INTO v_henry_org_id
  FROM profiles
  WHERE email LIKE '%henry%' OR email = v_henry_email
  LIMIT 1;
  
  IF v_henry_org_id IS NULL THEN
    RAISE EXCEPTION '❌ No se encontró la organización de Henry';
  END IF;
  
  RAISE NOTICE '✅ Organización de Henry encontrada: %', v_henry_org_id;
  
  -- PASO 2: Mover TODOS los usuarios a la organización de Henry
  -- (excepto Henry mismo)
  UPDATE profiles
  SET organization_id = v_henry_org_id
  WHERE organization_id != v_henry_org_id
    OR organization_id IS NULL;
  
  GET DIAGNOSTICS v_usuarios_movidos = ROW_COUNT;
  RAISE NOTICE '✅ Usuarios movidos: %', v_usuarios_movidos;
  
  -- PASO 3: Actualizar user_roles
  -- Eliminar roles antiguos
  DELETE FROM user_roles
  WHERE organization_id != v_henry_org_id;
  
  -- Insertar roles correctos (Henry = admin, otros = cobrador)
  INSERT INTO user_roles (user_id, organization_id, role, created_at)
  SELECT 
    p.id,
    v_henry_org_id,
    CASE 
      WHEN p.email LIKE '%henry%' OR p.email = v_henry_email THEN 'admin'
      ELSE 'cobrador'
    END as role,
    NOW()
  FROM profiles p
  WHERE p.organization_id = v_henry_org_id
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    created_at = NOW();
  
  RAISE NOTICE '✅ Roles actualizados correctamente';
  
  -- PASO 4: Actualizar campo role en profiles
  UPDATE profiles p
  SET role = ur.role
  FROM user_roles ur
  WHERE p.id = ur.user_id
    AND ur.organization_id = v_henry_org_id;
  
  RAISE NOTICE '✅ Campo role en profiles actualizado';
END $$;

SELECT '✓ Paso 1-4: Usuarios movidos y roles actualizados' as " ";

-- =========================================================
-- VERIFICACIÓN
-- =========================================================

SELECT '========================================' as " ";
SELECT '🔍 VERIFICACIÓN' as " ";
SELECT '========================================' as " ";

-- Ver TODOS los usuarios ahora (deben estar en la MISMA org)
SELECT 
  'USUARIOS DESPUÉS DEL CAMBIO:' as info,
  p.email,
  o.nombre_negocio as organizacion,
  p.role,
  pl.nombre as plan_organizacion,
  pl.limite_clientes,
  pl.limite_prestamos
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN planes pl ON pl.id = o.plan_id
ORDER BY 
  CASE WHEN p.role = 'admin' THEN 0 ELSE 1 END,
  p.email
LIMIT 20;

-- Contar usuarios por organización
SELECT 
  'USUARIOS POR ORGANIZACIÓN:' as info,
  o.nombre_negocio,
  pl.nombre as plan,
  COUNT(p.id) as total_usuarios,
  COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN p.role = 'cobrador' THEN 1 END) as cobradores
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.nombre_negocio, pl.nombre
ORDER BY total_usuarios DESC;

-- Verificar que NO haya organizaciones vacías con plan profesional
SELECT 
  'ORGANIZACIONES VACÍAS:' as info,
  o.nombre_negocio,
  pl.nombre as plan,
  COUNT(p.id) as usuarios
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.nombre_negocio, pl.nombre
HAVING COUNT(p.id) = 0;

SELECT '========================================' as " ";
SELECT '✅ SOLUCIÓN APLICADA' as " ";
SELECT '========================================' as " ";
SELECT '' as " ";
SELECT '📋 RESULTADO ESPERADO:' as " ";
SELECT 'Todos los usuarios deben estar en la org "Henry"' as " ";
SELECT 'Esa org debe tener "Plan Profesional"' as " ";
SELECT 'Henry debe ser admin, otros cobradores' as " ";
SELECT '' as " ";
SELECT '🚀 SIGUIENTE PASO:' as " ";
SELECT '1. Refresca tu navegador (Ctrl+F5)' as " ";
SELECT '2. Inicia sesión como admin y como cobrador' as " ";
SELECT '3. AMBOS deben ver "Plan Profesional" con los mismos límites' as " ";
SELECT '========================================' as " ";
