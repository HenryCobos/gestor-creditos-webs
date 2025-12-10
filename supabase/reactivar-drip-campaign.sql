-- =====================================================
-- REACTIVAR CAMPAÑA DE DRIP EMAILS
-- =====================================================
-- Este script reactiva la campaña de emails de 7 días
-- Solo ejecutar cuando esté listo para usarse
-- =====================================================

-- PASO 1: Verificar que la función existe
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'handle_new_user_email_campaign';

-- Si no existe, primero ejecutar: supabase/migrations/create_email_campaigns.sql

-- =====================================================
-- PASO 2: Recrear el trigger
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created_email_campaign ON auth.users;

CREATE TRIGGER on_auth_user_created_email_campaign
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_email_campaign();

-- =====================================================
-- PASO 3: Verificar que el trigger fue creado
-- =====================================================

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ACTIVO'
    WHEN tgenabled = 'D' THEN '⚠️ DESACTIVADO'
    ELSE '❓ DESCONOCIDO'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created_email_campaign';

-- Debería mostrar: enabled = 'O' (Origin/Activo)

-- =====================================================
-- PASO 4: Probar con un usuario de prueba (opcional)
-- =====================================================

-- Registra un usuario de prueba en la aplicación
-- Luego verifica que se agregó a email_campaigns:

-- SELECT * FROM email_campaigns 
-- WHERE email = 'tu-email-de-prueba@ejemplo.com';

-- =====================================================
-- CHECKLIST POST-REACTIVACIÓN
-- =====================================================

-- [ ] Trigger recreado y activo
-- [ ] Cron job descomentado en vercel.json
-- [ ] RESEND_API_KEY configurado en Vercel
-- [ ] CRON_SECRET configurado en Vercel
-- [ ] NEXT_PUBLIC_APP_URL configurado en Vercel
-- [ ] Deploy realizado en Vercel
-- [ ] Prueba con usuario de prueba exitosa

-- =====================================================
-- CONFIRMACIÓN
-- =====================================================

SELECT 
  '✅ Campaña de drip emails REACTIVADA' as status,
  'Nuevos usuarios se agregarán automáticamente' as info,
  'El cron job enviará emails diariamente a las 2 PM UTC' as cron_info;

