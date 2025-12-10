-- =====================================================
-- DESACTIVAR CAMPAÑA DE DRIP EMAILS TEMPORALMENTE
-- =====================================================
-- Este script desactiva la campaña de emails de 7 días
-- para prevenir rebotes y problemas mientras se soluciona
-- =====================================================

-- PASO 1: Desactivar el trigger que agrega usuarios a email_campaigns
-- Esto previene que nuevos usuarios se agreguen automáticamente

DROP TRIGGER IF EXISTS on_auth_user_created_email_campaign ON auth.users;

COMMENT ON FUNCTION handle_new_user_email_campaign() IS 'DESACTIVADO: Trigger desactivado temporalmente. Para reactivar, ejecutar: CREATE TRIGGER on_auth_user_created_email_campaign AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_email_campaign();';

-- =====================================================
-- PASO 2: Verificar que el trigger fue desactivado
-- =====================================================

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created_email_campaign';

-- Si no retorna ninguna fila, el trigger fue eliminado exitosamente ✅

-- =====================================================
-- INFORMACIÓN: Estado actual
-- =====================================================

-- Ver cuántos usuarios están en la tabla email_campaigns
SELECT COUNT(*) as total_usuarios_en_campaign FROM email_campaigns;

-- Ver usuarios con emails pendientes de envío
SELECT 
  COUNT(*) as usuarios_con_emails_pendientes
FROM email_campaigns
WHERE 
  day_1_sent_at IS NULL OR
  day_2_sent_at IS NULL OR
  day_3_sent_at IS NULL OR
  day_4_sent_at IS NULL OR
  day_5_sent_at IS NULL OR
  day_6_sent_at IS NULL OR
  day_7_sent_at IS NULL;

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================

-- El cron job en vercel.json también debe ser desactivado manualmente:
-- 1. Editar vercel.json
-- 2. Comentar o eliminar la sección "crons"
-- 3. Hacer commit y push

-- Para reactivar la campaña en el futuro:
-- 1. Ejecutar: supabase/reactivar-drip-campaign.sql
-- 2. Descomentar el cron job en vercel.json
-- 3. Verificar que RESEND_API_KEY esté configurado
-- 4. Hacer commit y push

-- =====================================================
-- CONFIRMACIÓN
-- =====================================================

SELECT 
  '✅ Campaña de drip emails DESACTIVADA' as status,
  'El trigger fue eliminado correctamente' as trigger_status,
  'Recuerda comentar el cron job en vercel.json' as recordatorio;

