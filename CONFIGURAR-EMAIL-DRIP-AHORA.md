# 🚀 Configurar Email Drip Campaign - Paso a Paso

## ✅ Ya está implementado:

```
✅ Resend instalado
✅ Tabla SQL creada
✅ 7 templates de email listos
✅ API route para enviar emails
✅ Lógica de cron job completa
```

---

## 📋 Pasos de Configuración (30 minutos)

### PASO 1: Obtener API Key de Resend (5 min)

1. **Ir a:** https://resend.com/signup
2. **Registrarte** con tu email
3. **Verificar email** que te envían
4. **Ir a:** API Keys (menú izquierdo)
5. **Click en:** "Create API Key"
6. **Nombre:** "Gestor Créditos Production"
7. **Permisos:** Full Access
8. **Click:** Create
9. **Copiar la key** (empieza con `re_...`)
   - ⚠️ Solo la verás una vez, guárdala

---

### PASO 2: Configurar Variables de Entorno (5 min)

#### En local (`.env.local`):

```env
# Resend
RESEND_API_KEY=re_tuKeyAqui...

# Cron Secret (generar uno random)
CRON_SECRET=tu_secreto_super_seguro_123

# Supabase Service Role (ya deberías tenerlo)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# URL de tu app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### En Vercel (Producción):

1. **Ir a:** Vercel Dashboard → Tu Proyecto → Settings
2. **Click:** Environment Variables
3. **Agregar estas variables:**

```
Name: RESEND_API_KEY
Value: re_tuKeyAqui...
Environment: Production, Preview, Development

Name: CRON_SECRET  
Value: tu_secreto_super_seguro_123
Environment: Production

Name: SUPABASE_SERVICE_ROLE_KEY
Value: (tu service role key de Supabase)
Environment: Production, Preview, Development

Name: NEXT_PUBLIC_APP_URL
Value: https://tu-dominio.vercel.app
Environment: Production
```

4. **Click:** Save

**Generar CRON_SECRET random:**
```bash
# En terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### PASO 3: Crear Tabla en Supabase (5 min)

1. **Ir a:** Supabase Dashboard
2. **Tu Proyecto** → SQL Editor
3. **New Query**
4. **Abrir archivo:** `supabase/migrations/create_email_campaigns.sql`
5. **Copiar TODO el contenido** y pegar en Supabase
6. **Click:** Run (ejecutar)
7. **Verificar:** Debería decir "Success. No rows returned"

**Verificar que se creó:**
```sql
SELECT * FROM email_campaigns LIMIT 1;
```
Debería mostrar columnas (aunque esté vacío).

---

### PASO 4: Configurar Dominio en Resend (10 min)

**Opción A: Usar dominio propio (Recomendado)**

1. **Ir a:** Resend → Domains
2. **Add Domain**
3. **Ingresar:** tu-dominio.com (o gestorcreditos.com)
4. **Agregar registros DNS:**
   - Copiar los registros MX, TXT, CNAME que te da Resend
   - Ir a tu proveedor de dominio (Namecheap, GoDaddy, etc.)
   - Agregar los registros DNS
   - Esperar 5-15 minutos
5. **Verify Domain** en Resend
6. **Estado:** Debería aparecer ✅ "Verified"

**Opción B: Usar dominio de prueba de Resend (Para testing)**

1. Puedes usar: `onboarding@resend.dev`
2. Solo para testing, 100 emails/día
3. **Cambiar en:** `app/api/cron/send-drip-emails/route.ts`
   ```typescript
   from: 'Henry <onboarding@resend.dev>',
   ```

---

### PASO 5: Configurar Cron Job en Vercel (5 min)

1. **Ir a:** Vercel Dashboard → Tu Proyecto → Settings
2. **Click:** Cron Jobs (menú izquierdo)
3. **Si no está disponible:** Necesitas plan Pro de Vercel ($20/mes)
   - **Alternativa:** Usar cron-job.org (gratis)

#### Opción A: Vercel Cron (Recomendado si tienes Pro)

1. **Click:** Add Cron Job
2. **Configurar:**
   ```
   Name: Send Drip Emails
   Schedule: 0 8 * * *
   Path: /api/cron/send-drip-emails
   Method: GET
   ```
3. **Headers:** 
   ```
   Authorization: Bearer tu_cron_secret_aqui
   ```
4. **Save**

#### Opción B: cron-job.org (Gratis, cualquier plan Vercel)

1. **Ir a:** https://cron-job.org/en/signup
2. **Registrarte**
3. **Create Cronjob:**
   ```
   Title: Gestor Créditos Drip Emails
   Address: https://tu-dominio.vercel.app/api/cron/send-drip-emails
   Schedule: Every day at 08:00 (tu zona horaria)
   ```
4. **Request method:** GET
5. **Headers:** 
   - Click "Enable request headers"
   - Add header:
     - Name: `Authorization`
     - Value: `Bearer tu_cron_secret_aqui`
6. **Save**
7. **Enable:** Turn ON

---

## 🧪 PASO 6: Testing (10 min)

### Test 1: Crear usuario de prueba

```sql
-- En Supabase SQL Editor
-- Crear un usuario de prueba que se registró hace 1 día
INSERT INTO email_campaigns (user_id, email, full_name, created_at)
VALUES (
  gen_random_uuid(),
  'tu-email@gmail.com',  -- TU EMAIL REAL para testing
  'Usuario Prueba',
  NOW() - INTERVAL '1 day'  -- Hace 1 día
);
```

### Test 2: Ejecutar cron manualmente

**Opción A: Desde tu navegador**

```
https://tu-dominio.vercel.app/api/cron/send-drip-emails
```

Agregar header en Postman o usar curl:
```bash
curl -X GET https://tu-dominio.vercel.app/api/cron/send-drip-emails \
  -H "Authorization: Bearer tu_cron_secret"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "summary": {
    "total_campaigns": 1,
    "emails_sent": 1,
    "errors": 0
  },
  "emails_sent": [
    {
      "email": "tu-email@gmail.com",
      "day": 1,
      "sent_at": "..."
    }
  ]
}
```

### Test 3: Verificar email recibido

1. **Revisar tu inbox**
2. **Buscar:** Email de "Henry" con asunto "🎯 Tu primer cliente perfecto"
3. **Verificar:** Que se vea bien y los links funcionen

### Test 4: Verificar base de datos

```sql
-- Ver que se marcó como enviado
SELECT 
  email,
  full_name,
  day_1_sent_at,
  created_at
FROM email_campaigns
WHERE email = 'tu-email@gmail.com';
```

Debería mostrar `day_1_sent_at` con una fecha.

---

## 📊 Monitoreo

### Ver estadísticas en Resend:

1. **Ir a:** https://resend.com/emails
2. **Ver:** Emails enviados, abiertos, clicks
3. **Analytics:** Delivery rate, bounce rate

### Ver estadísticas en Supabase:

```sql
-- Ver cuántos emails se han enviado de cada día
SELECT 
  COUNT(*) FILTER (WHERE day_1_sent_at IS NOT NULL) as day_1,
  COUNT(*) FILTER (WHERE day_2_sent_at IS NOT NULL) as day_2,
  COUNT(*) FILTER (WHERE day_3_sent_at IS NOT NULL) as day_3,
  COUNT(*) FILTER (WHERE day_4_sent_at IS NOT NULL) as day_4,
  COUNT(*) FILTER (WHERE day_5_sent_at IS NOT NULL) as day_5,
  COUNT(*) FILTER (WHERE day_6_sent_at IS NOT NULL) as day_6,
  COUNT(*) FILTER (WHERE day_7_sent_at IS NOT NULL) as day_7,
  COUNT(*) as total_users
FROM email_campaigns
WHERE unsubscribed = FALSE;
```

---

## ✅ Checklist Final

Antes de considerar completo:

- [ ] ✅ Resend API Key obtenida
- [ ] ✅ Variables de entorno configuradas (local y Vercel)
- [ ] ✅ Dominio verificado en Resend
- [ ] ✅ Tabla `email_campaigns` creada en Supabase
- [ ] ✅ Trigger de nuevos usuarios funcionando
- [ ] ✅ Cron job configurado (Vercel o cron-job.org)
- [ ] ✅ Test manual realizado exitosamente
- [ ] ✅ Email de prueba recibido y se ve bien
- [ ] ✅ Database actualizada correctamente

---

## 🎯 Deploy Final

```bash
# 1. Commit todos los cambios
git add .
git commit -m "feat: Implementar email drip campaign de 7 días"

# 2. Push a producción
git push origin main

# 3. Esperar deploy de Vercel (2-3 min)

# 4. Verificar en Vercel logs
```

---

## 🔧 Troubleshooting

### Problema: "Unauthorized" al llamar al cron

**Solución:**
- Verificar que el header Authorization esté correcto
- Verificar que CRON_SECRET en Vercel coincida con el que usas

### Problema: "Error connecting to Supabase"

**Solución:**
- Verificar SUPABASE_SERVICE_ROLE_KEY en variables de entorno
- Verificar que la tabla exista: `SELECT * FROM email_campaigns;`

### Problema: No llega el email

**Solución:**
1. Revisar logs de Resend: https://resend.com/emails
2. Verificar que el dominio esté verificado
3. Revisar spam/junk folder
4. Verificar que RESEND_API_KEY sea correcta

### Problema: Email llega pero links no funcionan

**Solución:**
- Verificar NEXT_PUBLIC_APP_URL en variables de entorno
- Debe ser la URL real de producción

---

## 📞 Soporte

### Resend:
- Docs: https://resend.com/docs
- Discord: https://discord.gg/resend

### Si algo no funciona:
1. Revisar logs de Vercel: Dashboard → Deployments → View Function Logs
2. Revisar logs de Resend: https://resend.com/emails
3. Verificar tabla en Supabase

---

## 🎉 ¡Listo!

Una vez completado todo, los nuevos usuarios recibirán automáticamente:
- Día 0: Email de bienvenida (configurado en Supabase Auth)
- Día 1-7: Secuencia de onboarding educativo

**Conversión esperada: 5-8% de gratuito a pago** 🚀

---

## 📈 Próximos Pasos (Opcionales)

1. **Crear página de unsubscribe**
2. **Agregar tracking de clicks**
3. **A/B testing de subject lines**
4. **Dashboard de analytics**
5. **Segmentación por comportamiento**

¿Quieres que implemente alguno de estos? 😊

---

**Fecha:** Noviembre 2024  
**Estado:** ✅ Implementación Básica Completa  
**Tiempo total de setup:** 30-40 minutos

