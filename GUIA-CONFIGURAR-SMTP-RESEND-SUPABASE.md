# 📧 Guía: Configurar SMTP Personalizado (Resend) en Supabase

## ⚠️ **POR QUÉ ES NECESARIO**

Supabase está restringiendo el envío de emails por alta tasa de rebotes. La **solución definitiva** es usar un proveedor SMTP personalizado (Resend) en lugar del servicio de email por defecto de Supabase.

---

## ✅ **VENTAJAS DE USAR RESEND COMO SMTP**

1. ✅ **Mayor control** sobre el envío de emails
2. ✅ **Métricas detalladas** de entrega, aperturas, clics
3. ✅ **Sin límites arbitrarios** de Supabase
4. ✅ **Mejor reputación** de dominio
5. ✅ **Ya lo tienes configurado** para los cron jobs

---

## 🔧 **PASO 1: Obtener Credenciales SMTP de Resend**

### A) Ir a Resend Dashboard
1. Ve a: https://resend.com/api-keys
2. Busca tu API Key actual o crea una nueva

### B) Obtener Configuración SMTP
Resend usa las siguientes credenciales SMTP:

| Campo | Valor |
|-------|-------|
| **Host** | `smtp.resend.com` |
| **Puerto** | `465` (SSL) o `587` (TLS) |
| **Usuario** | `resend` |
| **Contraseña** | Tu API Key de Resend (ej: `re_123abc...`) |

---

## 🔧 **PASO 2: Configurar SMTP en Supabase**

### A) Ir a Authentication Settings
1. Abre tu proyecto en Supabase: https://supabase.com/dashboard/project/yejgopxlezrqmbirbzl
2. Ve a: **Authentication** → **Email Templates**
3. Desplázate hasta el final y busca: **"SMTP Settings"** o **"Custom SMTP"**

### B) Configurar Resend SMTP

Ingresa los siguientes valores:

```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: [TU_RESEND_API_KEY]
Sender Email: noreply@tu-dominio-vercel.app
Sender Name: Gestor Créditos
```

⚠️ **IMPORTANTE:**
- Usa el puerto **587** (TLS) en lugar de 465 (SSL)
- En "Sender Email" usa: `noreply@tu-dominio-vercel.app` o el dominio que configuraste en Resend
- La contraseña SMTP es tu **API Key de Resend** completa

### C) Probar la Conexión
Supabase debería tener un botón para **"Test SMTP Settings"** o similar. Úsalo para verificar que funciona.

---

## 🔧 **PASO 3: Configurar Dominio en Resend (Opcional pero Recomendado)**

Si quieres usar un dominio personalizado (ej: `noreply@tucredito.com`) en lugar del dominio de Vercel:

### A) Agregar Dominio en Resend
1. Ve a: https://resend.com/domains
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `tucredito.com`)

### B) Configurar DNS
Resend te dará registros DNS para agregar a tu proveedor de dominio:
- **SPF**: Registro TXT para verificación
- **DKIM**: Registro CNAME para firma de emails
- **Return-Path**: Registro CNAME para rebotes

### C) Esperar Verificación
- La verificación puede tardar **5-30 minutos**
- Una vez verificado, podrás enviar desde `noreply@tucredito.com`

---

## 🔧 **PASO 4: Actualizar Templates de Email en Supabase**

Una vez configurado el SMTP, verifica que tus templates de email estén correctos:

1. Ve a: **Authentication** → **Email Templates**
2. Revisa los siguientes templates:
   - ✅ **Confirm signup**: Para nuevos registros
   - ✅ **Invite user**: Para invitaciones
   - ✅ **Magic Link**: Para login sin contraseña
   - ✅ **Change Email Address**: Para cambio de email
   - ✅ **Reset Password**: Para recuperación de contraseña

3. Asegúrate de que:
   - El `{{ .ConfirmationURL }}` esté presente
   - El diseño sea profesional
   - El remitente sea correcto

---

## 🔧 **PASO 5: Re-activar "Confirm Email" (Opcional)**

Si quieres que los usuarios confirmen su email al registrarse:

1. Ve a: **Authentication** → **Providers** → **Email**
2. Activa: **"Confirm email"**
3. Desactiva: **"Secure email change"** (si no la usas)

⚠️ **NOTA:** Solo activa esto **DESPUÉS** de configurar el SMTP personalizado.

---

## 🧪 **PASO 6: Probar Todo el Flujo**

### A) Crear Usuario de Prueba
```bash
# Desde tu app o SQL Editor en Supabase
-- NO uses emails de prueba (test@test.com)
-- Usa un email REAL que controles
```

### B) Verificar Email Llegue
1. Regístrate con un email real
2. Verifica que llegue el email de confirmación
3. Haz clic en el link de confirmación
4. Verifica que puedas hacer login

### C) Verificar en Resend Dashboard
1. Ve a: https://resend.com/emails
2. Deberías ver el email enviado
3. Verifica el estado: **"Delivered"** ✅

---

## 📊 **COMPARACIÓN: Antes vs Después**

| Aspecto | 🚫 Antes (SMTP por defecto) | ✅ Después (Resend SMTP) |
|---------|----------------------------|--------------------------|
| **Control** | Limitado | Total |
| **Métricas** | Básicas | Detalladas |
| **Límites** | Restrictivos | Generosos (50K/mes gratis) |
| **Rebotes** | Sin visibilidad | Dashboard completo |
| **Reputación** | Compartida | Tu propio dominio |
| **Restricciones** | Supabase decide | Tú decides |

---

## ⚠️ **TROUBLESHOOTING**

### Error: "SMTP Connection Failed"
- Verifica que el puerto sea **587** (no 465)
- Verifica que la API Key sea correcta
- Verifica que no tenga espacios al inicio/fin

### Error: "Authentication Failed"
- El usuario debe ser exactamente: `resend`
- La contraseña es tu **API Key completa** (ej: `re_123abc...`)

### Emails no llegan
- Verifica en Resend Dashboard si se enviaron
- Revisa la carpeta de SPAM
- Verifica que el dominio esté verificado en Resend

### Supabase sigue usando SMTP por defecto
- Guarda los cambios en SMTP Settings
- Espera 5 minutos para que se apliquen
- Prueba con un nuevo registro

---

## 🎯 **CHECKLIST FINAL**

- [ ] Obtener API Key de Resend
- [ ] Configurar SMTP en Supabase (smtp.resend.com:587)
- [ ] Probar conexión SMTP
- [ ] (Opcional) Configurar dominio personalizado en Resend
- [ ] Verificar templates de email en Supabase
- [ ] (Opcional) Re-activar "Confirm Email"
- [ ] Probar con registro real
- [ ] Verificar email llegue correctamente
- [ ] Verificar en Resend Dashboard

---

## 📧 **CONTACTO CON SUPABASE**

Si después de configurar SMTP sigues teniendo restricciones:

1. Contacta a Supabase Support: https://supabase.com/dashboard/support
2. Menciona que:
   - Ya configuraste SMTP personalizado con Resend
   - Ya limpiaste emails de prueba
   - Solicitas levantar la restricción temporal

---

## 🚀 **RESULTADO ESPERADO**

✅ **Emails transaccionales** (confirmación, reset password) se enviarán vía Resend  
✅ **Sin restricciones** de Supabase  
✅ **Métricas detalladas** en Resend Dashboard  
✅ **Mejor tasa de entrega** (deliverability)  
✅ **Sin bounce backs** que causen problemas  

---

**Happy Hacking! 🎉**

