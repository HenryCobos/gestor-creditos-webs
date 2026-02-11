-- =========================================================
-- SOLUCIÓN SIMPLE Y DEFINITIVA
-- =========================================================
-- Fecha: 11 Feb 2026
-- 
-- Este script es SIMPLE y hace 3 cosas:
-- 1. Muestra tu situación actual (sin cambios)
-- 2. Mueve cobradores a la organización correcta (basado en user_roles)
-- 3. Verifica el resultado
-- =========================================================

SELECT '========================================';
SELECT '🔍 DIAGNÓSTICO INICIAL';
SELECT '========================================';

-- Ver tus organizaciones actuales
SELECT 
  o.id,
  o.nombre_negocio,
  COALESCE(pl.nombre, 'Sin Plan') as plan,
  COALESCE(pl.slug, 'N/A') as slug,
  COALESCE(pl.limite_clientes, 0) as limite_clientes,
  COALESCE(pl.limite_prestamos, 0) as limite_prestamos,
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id) as usuarios
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
ORDER BY usuarios DESC, o.created_at DESC
LIMIT 30;

SELECT '========================================';
SELECT '🔧 INICIANDO CORRECCIÓN';
SELECT '========================================';

-- =========================================================
-- CORRECCIÓN: Mover usuarios según user_roles
-- =========================================================

DO $$
DECLARE
  v_user RECORD;
  v_movidos INTEGER := 0;
BEGIN
  -- Para cada usuario cuya organization_id en profiles NO coincide con user_roles
  FOR v_user IN
    SELECT 
      p.id as user_id,
      p.email,
      p.organization_id as org_actual,
      ur.organization_id as org_correcta,
      ur.role as rol_correcto
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.organization_id != ur.organization_id
      OR p.organization_id IS NULL
  LOOP
    -- Actualizar a la organización correcta
    UPDATE profiles
    SET 
      organization_id = v_user.org_correcta,
      role = v_user.rol_correcto,
      updated_at = NOW()
    WHERE id = v_user.user_id;
    
    v_movidos := v_movidos + 1;
    RAISE NOTICE '✓ Movido: % a org correcta', v_user.email;
  END LOOP;
  
  IF v_movidos = 0 THEN
    RAISE NOTICE '✅ Todos los usuarios ya están en la organización correcta';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Total usuarios corregidos: %', v_movidos;
    RAISE NOTICE '========================================';
  END IF;
END $$;

-- =========================================================
-- VERIFICACIÓN FINAL
-- =========================================================

SELECT '========================================';
SELECT '✅ RESULTADO FINAL';
SELECT '========================================';

-- Ver organizaciones con usuarios
SELECT 
  o.nombre_negocio as organizacion,
  COALESCE(pl.nombre, 'Sin Plan') as plan,
  COALESCE(pl.limite_clientes, 0) as limite_clientes,
  COALESCE(pl.limite_prestamos, 0) as limite_prestamos,
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id) as total_usuarios,
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id AND p.role = 'admin') as admins,
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id AND p.role = 'cobrador') as cobradores
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE EXISTS (SELECT 1 FROM profiles p WHERE p.organization_id = o.id)
ORDER BY 
  CASE 
    WHEN pl.slug = 'pro' THEN 0
    WHEN pl.slug = 'profesional' THEN 0
    WHEN pl.slug = 'business' THEN 1
    WHEN pl.slug = 'free' THEN 2
    ELSE 3
  END,
  total_usuarios DESC
LIMIT 30;

SELECT '========================================';
SELECT '🎯 SIGUIENTE PASO';
SELECT '========================================';
SELECT '1. Refresca tu navegador (Ctrl+F5)';
SELECT '2. Ve al Dashboard';
SELECT '3. Admin y cobradores deben ver el mismo plan';
SELECT '========================================';
