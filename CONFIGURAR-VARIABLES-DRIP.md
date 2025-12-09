# ⚙️ Variables de Entorno para Email Drip Campaign

## 📋 Variables Necesarias en Vercel

Ve a: https://vercel.com/dashboard → Tu proyecto → Settings → Environment Variables

### **1. CRON_SECRET** (Nueva - Agregar)

```
Name: CRON_SECRET
Value: drip-emails-secret-2024-gestor-creditos
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

**Propósito:** Autenticar las llamadas al cron job para seguridad.

---

### **2. RESEND_API_KEY** (Ya existe - Verificar)

```
Name: RESEND_API_KEY
Value: re_hGL5pMoR_25ct1qkzMXuY1Y4GY4zcN...
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

**Status:** ✅ Ya configurada (verificar que esté en los 3 entornos)

---

### **3. NEXT_PUBLIC_APP_URL** (Nueva - Agregar)

```
Name: NEXT_PUBLIC_APP_URL
Value: https://gestor-creditos-webs.vercel.app
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

**Propósito:** URL base para los links en los emails (botones, dashboard, etc.)

---

## 🔧 Pasos para Agregar:

1. **Ir a:** https://vercel.com/dashboard
2. **Seleccionar proyecto:** gestor-creditos-webs
3. **Clic en:** Settings → Environment Variables
4. **Para cada variable:**
   - Clic en "Add New"
   - Pegar Name y Value
   - Seleccionar los 3 entornos ☑️
   - Clic en "Save"

---

## ⚡ Después de Agregar:

1. **Redeploy** el proyecto para que tome las nuevas variables
2. **Probar manualmente** el endpoint de drip emails
3. **Verificar** en Supabase que se actualicen los `day_X_sent_at`

---

## 🧪 Probar Manualmente (Después del Deploy):

```bash
# Desde tu navegador o Postman:
https://gestor-creditos-webs.vercel.app/api/cron/send-drip-emails?key=test-drip-123
```

Deberías ver una respuesta JSON con los emails enviados.

---

## ✅ Checklist:

- [ ] Agregar `CRON_SECRET` en Vercel
- [ ] Verificar `RESEND_API_KEY` en Vercel
- [ ] Agregar `NEXT_PUBLIC_APP_URL` en Vercel
- [ ] Redeploy el proyecto
- [ ] Probar endpoint manualmente
- [ ] Verificar tabla `email_campaigns` en Supabase

