-- =====================================================
-- CORREGIR ISSUES DE SEGURIDAD - SEARCH_PATH
-- =====================================================
-- Esto corrige el warning: "role mutable search_path"
-- Al añadir SET search_path se previene ataques de inyección
-- =====================================================

-- =====================================================
-- 1. CORREGIR: get_empeños_vencidos
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_empeños_vencidos(user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  prestamo_id UUID,
  cliente_id UUID,
  cliente_nombre TEXT,
  garantia_id UUID,
  garantia_descripcion TEXT,
  fecha_vencimiento DATE,
  dias_vencido INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.cliente_id,
    c.nombre,
    g.id,
    g.descripcion,
    g.fecha_vencimiento,
    EXTRACT(DAY FROM (CURRENT_DATE - g.fecha_vencimiento))::INTEGER as dias_vencido
  FROM public.prestamos p
  INNER JOIN public.clientes c ON c.id = p.cliente_id
  LEFT JOIN public.garantias g ON g.prestamo_id = p.id
  WHERE p.tipo_prestamo = 'empeño'
    AND g.estado = 'activo'
    AND g.fecha_vencimiento < CURRENT_DATE
    AND (user_uuid IS NULL OR p.user_id = user_uuid)
  ORDER BY g.fecha_vencimiento ASC;
END;
$$;

-- =====================================================
-- 2. CORREGIR: get_user_plan_limits
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(user_uuid UUID)
RETURNS TABLE (
  limite_clientes INTEGER,
  limite_prestamos INTEGER,
  limite_usuarios INTEGER,
  plan_nombre VARCHAR,
  caracteristicas JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.limite_clientes,
    p.limite_prestamos,
    p.limite_usuarios,
    p.nombre,
    p.caracteristicas
  FROM profiles prof
  JOIN planes p ON prof.plan_id = p.id
  WHERE prof.id = user_uuid;
  
  -- Si por alguna razón aún no hay resultado, retornar el plan gratuito
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.limite_clientes,
      p.limite_prestamos,
      p.limite_usuarios,
      p.nombre,
      p.caracteristicas
    FROM planes p
    WHERE p.slug = 'free'
    LIMIT 1;
  END IF;
END;
$$;

-- =====================================================
-- 3. CORREGIR: can_add_cliente
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_add_cliente(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  limite INTEGER;
  actual INTEGER;
BEGIN
  -- Obtener límite del plan (con fallback a plan gratuito)
  SELECT COALESCE(
    (SELECT p.limite_clientes
     FROM profiles prof
     JOIN planes p ON prof.plan_id = p.id
     WHERE prof.id = user_uuid),
    (SELECT limite_clientes FROM planes WHERE slug = 'free' LIMIT 1)
  ) INTO limite;
  
  -- Si es 0, es ilimitado
  IF limite = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Contar clientes actuales
  SELECT COUNT(*) INTO actual
  FROM clientes
  WHERE user_id = user_uuid;
  
  RETURN actual < limite;
END;
$$;

-- =====================================================
-- 4. CORREGIR: can_add_prestamo
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_add_prestamo(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  limite INTEGER;
  actual INTEGER;
BEGIN
  -- Obtener límite del plan (con fallback a plan gratuito)
  SELECT COALESCE(
    (SELECT p.limite_prestamos
     FROM profiles prof
     JOIN planes p ON prof.plan_id = p.id
     WHERE prof.id = user_uuid),
    (SELECT limite_prestamos FROM planes WHERE slug = 'free' LIMIT 1)
  ) INTO limite;
  
  -- Si es 0, es ilimitado
  IF limite = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Contar préstamos activos
  SELECT COUNT(*) INTO actual
  FROM prestamos
  WHERE user_id = user_uuid AND estado = 'activo';
  
  RETURN actual < limite;
END;
$$;

-- =====================================================
-- 5. CORREGIR: update_email_campaigns_updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_email_campaigns_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recrear el trigger (si existe)
DROP TRIGGER IF EXISTS update_email_campaigns_updated_at_trigger ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at_trigger
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_email_campaigns_updated_at();

-- =====================================================
-- 6. CORREGIR: handle_new_user_email_campaign
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_email_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insertar en email_campaigns automáticamente
  -- NOTA: Este trigger está DESACTIVADO por defecto
  -- Solo se activará si reactivamos la campaña de emails
  INSERT INTO public.email_campaigns (user_id, email, full_name, day_0_sent_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.created_at
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- NO recreamos el trigger aquí porque está intencionalmente desactivado
-- Si necesitas reactivarlo más tarde, ejecuta:
-- DROP TRIGGER IF EXISTS on_auth_user_created_email_campaign ON auth.users;
-- CREATE TRIGGER on_auth_user_created_email_campaign
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user_email_campaign();

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las funciones fueron actualizadas
SELECT 
  proname as funcion,
  prosrc as definicion_snippet,
  CASE 
    WHEN prosrc LIKE '%SET search_path%' OR proconfig::text LIKE '%search_path%' THEN '✅ CORREGIDO'
    ELSE '❌ FALTA CORREGIR'
  END as estado
FROM pg_proc
WHERE proname IN (
  'get_empeños_vencidos',
  'can_add_cliente',
  'can_add_prestamo',
  'update_email_campaigns_updated_at',
  'handle_new_user_email_campaign',
  'get_user_plan_limits'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Todas las funciones deben mostrar: ✅ CORREGIDO
-- Esto eliminará los 19 warnings de seguridad en Supabase
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Corrección de search_path completada';
  RAISE NOTICE '🔒 Vulnerabilidad de inyección de search_path corregida en 6 funciones';
  RAISE NOTICE '📊 Ejecuta la query de verificación para confirmar';
END $$;
