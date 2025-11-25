# ✅ Verificación Completa: Sistema de Registro y Emails

## 🎯 Objetivo

Asegurar que:
1. ✅ Los registros se completen correctamente (perfil + plan)
2. ✅ Los usuarios reciban el email de confirmación
3. ✅ Los usuarios reciban los emails de seguimiento (7 días)

---

## 📋 CHECKLIST DE VERIFICACIÓN

### **1. ✅ Registro Completo (Perfil + Plan)**

#### **1.1 Trigger de Registro**
- [ ] **Verificar que existe el trigger:**
  ```sql
  SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created';
  ```
  
  **Resultado esperado:** Debe mostrar el trigger activo

#### **1.2 Función handle_new_user()**
- [ ] **Verificar que la función existe:**
  ```sql
  SELECT 
    routine_name, 
    routine_type
  FROM information_schema.routines
  WHERE routine_name = 'handle_new_user';
  ```
  
  **Resultado esperado:** Debe mostrar la función

#### **1.3 Plan Gratuito Existe**
- [ ] **Verificar que el plan gratuito existe:**
  ```sql
  SELECT id, nombre, slug, limite_clientes, limite_prestamos
  FROM planes
  WHERE slug = 'free';
  ```
  
  **Resultado esperado:** Debe mostrar 1 fila con el plan gratuito

#### **1.4 Probar Registro Nuevo**
- [ ] Registrar un usuario de prueba
- [ ] Verificar que se creó el perfil:
  ```sql
  SELECT p.*, pl.nombre as plan_nombre
  FROM profiles p
  JOIN planes pl ON p.plan_id = pl.id
  WHERE p.email = 'email-de-prueba@test.com';
  ```
  
  **Resultado esperado:** Debe mostrar el perfil con plan "Gratuito"

---

### **2. ✅ Email de Confirmación (Supabase Auth)**

#### **2.1 Configuración de Email en Supabase**
- [ ] **Verificar configuración:**
  1. Ve a Supabase → **Authentication** → **Settings**
  2. Verifica que "Enable email confirmations" esté activado
  3. Verifica que "Site URL" esté configurado correctamente

#### **2.2 Template de Email de Confirmación**
- [ ] **Verificar que el template está configurado:**
  1. Ve a Supabase → **Authentication** → **Email Templates**
  2. Selecciona "Confirm signup"
  3. Verifica que tiene contenido (no está vacío)

#### **2.3 Probar Envío de Email**
- [ ] Registrar un usuario nuevo
- [ ] Verificar que recibió el email de confirmación
- [ ] Verificar que el email tiene el enlace de confirmación

#### **2.4 Verificar en Base de Datos**
- [ ] **Ver usuarios confirmados:**
  ```sql
  SELECT 
    email,
    created_at,
    confirmed_at,
    CASE 
      WHEN confirmed_at IS NOT NULL THEN '✅ Confirmado'
      ELSE '❌ No confirmado'
    END as estado
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 10;
  ```

---

### **3. ✅ Emails de Seguimiento (Drip Campaign - 7 días)**

#### **3.1 Tabla email_campaigns Existe**
- [ ] **Verificar que la tabla existe:**
  ```sql
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_name = 'email_campaigns';
  ```
  
  **Resultado esperado:** Debe mostrar 1 fila

#### **3.2 Trigger de Email Campaign**
- [ ] **Verificar que existe el trigger:**
  ```sql
  SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created_email_campaign';
  ```
  
  **Resultado esperado:** Debe mostrar el trigger activo

#### **3.3 Función handle_new_user_email_campaign()**
- [ ] **Verificar que la función existe:**
  ```sql
  SELECT 
    routine_name, 
    routine_type
  FROM information_schema.routines
  WHERE routine_name = 'handle_new_user_email_campaign';
  ```
  
  **Resultado esperado:** Debe mostrar la función

#### **3.4 Probar que se Agrega a email_campaigns**
- [ ] Registrar un usuario nuevo
- [ ] Verificar que se agregó a email_campaigns:
  ```sql
  SELECT 
    email,
    full_name,
    created_at,
    day_0_sent_at,
    day_1_sent_at,
    day_2_sent_at
  FROM email_campaigns
  WHERE email = 'email-de-prueba@test.com';
  ```
  
  **Resultado esperado:** Debe mostrar 1 fila con `day_0_sent_at` con fecha

#### **3.5 Configuración de Resend**
- [ ] **Verificar variable de entorno:**
  - Ve a Vercel → **Settings** → **Environment Variables**
  - Verifica que existe `RESEND_API_KEY`
  - Verifica que tiene un valor válido

#### **3.6 Cron Job Configurado**
- [ ] **Verificar que el cron job existe:**
  1. Ve a Vercel → **Settings** → **Cron Jobs**
  2. Verifica que existe un job para `/api/cron/send-drip-emails`
  3. Verifica que la frecuencia es diaria (una vez al día)

#### **3.7 Endpoint del Cron Job**
- [ ] **Verificar que el endpoint existe:**
  - Ruta: `app/api/cron/send-drip-emails/route.ts`
  - Debe existir el archivo

#### **3.8 Probar Envío Manual (Opcional)**
- [ ] **Ejecutar manualmente el cron job:**
  ```bash
  curl -X GET https://tu-app.vercel.app/api/cron/send-drip-emails \
    -H "Authorization: Bearer TU_CRON_SECRET"
  ```
  
  **Resultado esperado:** Debe devolver JSON con emails enviados

---

## 🔧 SCRIPT DE VERIFICACIÓN COMPLETA

Ejecuta este script en Supabase SQL Editor para verificar todo:

```sql
-- ============================================
-- VERIFICACIÓN COMPLETA DEL SISTEMA
-- ============================================

-- 1. Verificar Plan Gratuito
SELECT 
  'Plan Gratuito' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE'
  END as estado
FROM planes
WHERE slug = 'free';

-- 2. Verificar Trigger de Registro
SELECT 
  'Trigger de Registro' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Activo'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 3. Verificar Función handle_new_user
SELECT 
  'Función handle_new_user' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- 4. Verificar Tabla email_campaigns
SELECT 
  'Tabla email_campaigns' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.tables
WHERE table_name = 'email_campaigns';

-- 5. Verificar Trigger de Email Campaign
SELECT 
  'Trigger Email Campaign' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Activo'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created_email_campaign';

-- 6. Verificar Función handle_new_user_email_campaign
SELECT 
  'Función Email Campaign' as componente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.routines
WHERE routine_name = 'handle_new_user_email_campaign';

-- 7. Verificar Usuarios con Perfil y Plan
SELECT 
  'Usuarios con Perfil y Plan' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hay usuarios'
    ELSE '⚠️ No hay usuarios'
  END as estado
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
INNER JOIN planes pl ON p.plan_id = pl.id
WHERE p.plan_id IS NOT NULL;

-- 8. Verificar Usuarios en Email Campaign
SELECT 
  'Usuarios en Email Campaign' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hay usuarios'
    ELSE '⚠️ No hay usuarios'
  END as estado
FROM email_campaigns;

-- 9. Verificar Usuarios SIN Perfil (PROBLEMA)
SELECT 
  'Usuarios SIN Perfil' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos tienen perfil'
    ELSE '❌ HAY PROBLEMAS'
  END as estado
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 10. Verificar Usuarios SIN Plan (PROBLEMA)
SELECT 
  'Usuarios SIN Plan' as componente,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todos tienen plan'
    ELSE '❌ HAY PROBLEMAS'
  END as estado
FROM profiles
WHERE plan_id IS NULL;
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### **Problema 1: Usuarios no reciben email de confirmación**

**Causas posibles:**
- Email en carpeta de spam
- Template de email no configurado
- "Enable email confirmations" desactivado

**Solución:**
1. Verifica configuración en Supabase → Authentication → Settings
2. Verifica que el template está configurado
3. Reenvía manualmente desde Supabase → Authentication → Users

---

### **Problema 2: Usuarios no se agregan a email_campaigns**

**Causas posibles:**
- Trigger no existe o está desactivado
- Función tiene errores

**Solución:**
1. Ejecuta: `supabase/migrations/create_email_campaigns.sql`
2. Verifica que el trigger existe (usar script de verificación)
3. Agrega manualmente usuarios corregidos: `AGREGAR-USUARIOS-CORREGIDOS-A-EMAIL-CAMPAIGN.sql`

---

### **Problema 3: Emails de seguimiento no se envían**

**Causas posibles:**
- Cron job no configurado
- Resend API key incorrecta
- Endpoint tiene errores

**Solución:**
1. Verifica cron job en Vercel
2. Verifica `RESEND_API_KEY` en variables de entorno
3. Revisa logs en Vercel → Deployments → Functions
4. Prueba manualmente el endpoint

---

### **Problema 4: Registros no se completan (sin perfil o plan)**

**Causas posibles:**
- Trigger no existe
- Plan gratuito no existe
- Función tiene errores

**Solución:**
1. Ejecuta: `supabase/EJECUTAR-AHORA-corregir-registros-completo.sql`
2. Verifica que el plan gratuito existe
3. Prueba registrando un usuario nuevo

---

## ✅ RESULTADO ESPERADO

Después de verificar todo, deberías tener:

1. ✅ **Registro completo:**
   - Usuario se crea en `auth.users`
   - Perfil se crea automáticamente en `profiles`
   - Plan gratuito se asigna automáticamente

2. ✅ **Email de confirmación:**
   - Se envía automáticamente al registrar
   - Usuario puede confirmar su cuenta

3. ✅ **Emails de seguimiento:**
   - Usuario se agrega a `email_campaigns` automáticamente
   - Recibe email del día 1 al día 7 según su fecha de registro
   - Cron job envía emails automáticamente

---

## 📊 MONITOREO CONTINUO

Para monitorear que todo sigue funcionando:

### **Query Diaria: Verificar Registros del Día**
```sql
SELECT 
  u.email,
  u.created_at,
  CASE 
    WHEN p.id IS NOT NULL AND p.plan_id IS NOT NULL THEN '✅ OK'
    ELSE '❌ ERROR'
  END as estado_registro,
  CASE 
    WHEN ec.id IS NOT NULL THEN '✅ En campaña'
    ELSE '❌ No en campaña'
  END as estado_campana
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN email_campaigns ec ON u.id = ec.user_id
WHERE DATE(u.created_at) = CURRENT_DATE
ORDER BY u.created_at DESC;
```

### **Query Semanal: Verificar Emails Enviados**
```sql
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as usuarios_en_campana,
  COUNT(day_1_sent_at) as emails_dia_1_enviados,
  COUNT(day_2_sent_at) as emails_dia_2_enviados,
  COUNT(day_3_sent_at) as emails_dia_3_enviados
FROM email_campaigns
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Ejecuta el script de verificación completa
2. ✅ Revisa cada componente del checklist
3. ✅ Corrige cualquier problema encontrado
4. ✅ Prueba registrando un usuario nuevo
5. ✅ Monitorea durante una semana para confirmar que todo funciona

---

¿Necesitas ayuda con algún paso específico?

