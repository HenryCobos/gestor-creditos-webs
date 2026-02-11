-- =========================================================
-- FIX: CORREGIR PLANES DE TODAS LAS ORGANIZACIONES
-- =========================================================
-- Este script verifica TODAS las organizaciones y corrige
-- aquellas que deberían tener planes pagados pero tienen
-- plan gratuito
-- =========================================================

DO $$
DECLARE
  v_org RECORD;
  v_corregidas INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRIGIENDO PLANES DE ORGANIZACIONES';
  RAISE NOTICE '========================================';
  
  -- Buscar organizaciones con muchos recursos pero plan gratuito
  FOR v_org IN
    SELECT 
      o.id as org_id,
      o.nombre_negocio,
      pl.nombre as plan_actual,
      pl.slug as plan_slug,
      (SELECT COUNT(*) FROM clientes c 
       JOIN profiles p ON p.id = c.user_id 
       WHERE p.organization_id = o.id) as clientes_count,
      (SELECT COUNT(*) FROM prestamos pr 
       JOIN profiles p ON p.id = pr.user_id 
       WHERE p.organization_id = o.id) as prestamos_count
    FROM organizations o
    LEFT JOIN planes pl ON pl.id = o.plan_id
    WHERE pl.slug = 'free' OR pl.slug IS NULL
  LOOP
    -- Si la organización tiene más de 5 clientes O más de 5 préstamos
    -- debería tener un plan pagado
    IF v_org.clientes_count > 5 OR v_org.prestamos_count > 5 THEN
      RAISE NOTICE '⚠️  Organización "%" tiene % clientes y % préstamos pero plan %', 
        v_org.nombre_negocio, 
        v_org.clientes_count, 
        v_org.prestamos_count,
        v_org.plan_actual;
      
      -- Determinar qué plan necesita
      DECLARE
        v_nuevo_plan_id UUID;
        v_nuevo_plan_nombre TEXT;
      BEGIN
        IF v_org.clientes_count <= 50 AND v_org.prestamos_count <= 50 THEN
          -- Plan Profesional (50/50)
          SELECT id, nombre INTO v_nuevo_plan_id, v_nuevo_plan_nombre
          FROM planes
          WHERE slug IN ('pro', 'profesional')
          ORDER BY limite_clientes ASC
          LIMIT 1;
        ELSIF v_org.clientes_count <= 200 AND v_org.prestamos_count <= 200 THEN
          -- Plan Business (200/200)
          SELECT id, nombre INTO v_nuevo_plan_id, v_nuevo_plan_nombre
          FROM planes
          WHERE slug = 'business'
          LIMIT 1;
        ELSE
          -- Plan Enterprise (ilimitado)
          SELECT id, nombre INTO v_nuevo_plan_id, v_nuevo_plan_nombre
          FROM planes
          WHERE slug = 'enterprise'
          LIMIT 1;
        END IF;
        
        IF v_nuevo_plan_id IS NOT NULL THEN
          UPDATE organizations
          SET 
            plan_id = v_nuevo_plan_id,
            subscription_status = 'active',
            updated_at = NOW()
          WHERE id = v_org.org_id;
          
          RAISE NOTICE '✅ Organización actualizada a: %', v_nuevo_plan_nombre;
          v_corregidas := v_corregidas + 1;
        END IF;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COMPLETADO: % organizaciones corregidas', v_corregidas;
  RAISE NOTICE '========================================';
END $$;

-- Verificar organizaciones actualizadas
SELECT 
  'ORGANIZACIONES ACTUALIZADAS:' as info,
  o.nombre_negocio,
  pl.nombre as plan,
  pl.limite_clientes,
  pl.limite_prestamos,
  (SELECT COUNT(*) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id) as clientes,
  (SELECT COUNT(*) FROM prestamos pr JOIN profiles p ON p.id = pr.user_id WHERE p.organization_id = o.id) as prestamos,
  (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id) as usuarios
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE (SELECT COUNT(*) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id) > 0
   OR (SELECT COUNT(*) FROM prestamos pr JOIN profiles p ON p.id = pr.user_id WHERE p.organization_id = o.id) > 0
ORDER BY 
  (SELECT COUNT(*) FROM clientes c JOIN profiles p ON p.id = c.user_id WHERE p.organization_id = o.id) DESC;
