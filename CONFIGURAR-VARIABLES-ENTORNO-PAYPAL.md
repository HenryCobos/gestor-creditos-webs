# 🔐 Configurar Variables de Entorno de PayPal en Vercel

## 📋 Variables que Necesitas Configurar

Necesitas agregar **2 variables de entorno** en Vercel para que PayPal funcione:

### 1. `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
**Descripción:** ID de Cliente de PayPal (modo Live/Producción)

### 2. `PAYPAL_CLIENT_SECRET`
**Descripción:** Secret de PayPal (para webhooks)

---

## 🔍 Paso 1: Obtener las Credenciales de PayPal

### 1.1 Inicia Sesión en PayPal Developer

1. Ve a: https://developer.paypal.com/
2. Haz clic en **"Log in to Dashboard"**
3. Inicia sesión con tu cuenta de PayPal Business

### 1.2 Crear una App de PayPal (o usar una existente)

1. En el dashboard, haz clic en **"Apps & Credentials"**
2. Asegúrate de estar en la pestaña **"Live"** (no Sandbox)
3. Haz clic en **"Create App"** (o selecciona una app existente)
4. Dale un nombre: **"Gestor de Créditos"**
5. Haz clic en **"Create App"**

### 1.3 Copiar las Credenciales

Una vez creada la app:

1. **Client ID:**
   - Verás un campo llamado **"Client ID"**
   - Copia el valor (empieza con algo como `AbCdEf123...`)
   - Este será tu `NEXT_PUBLIC_PAYPAL_CLIENT_ID`

2. **Secret:**
   - Justo debajo del Client ID hay un campo **"Secret"**
   - Haz clic en **"Show"** para verlo
   - Copia el valor
   - Este será tu `PAYPAL_CLIENT_SECRET`

### 1.4 Activar las Funcionalidades de Suscripción

1. En la misma página, busca la sección **"Features"**
2. Asegúrate de que **"Subscriptions"** esté activado
3. Si no está activado, haz clic en **"Add Feature"** → **"Subscriptions"**

---

## ⚙️ Paso 2: Configurar las Variables en Vercel

### 2.1 Acceder a Vercel

1. Ve a: https://vercel.com
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: **"gestor-creditos-webs"**

### 2.2 Ir a Environment Variables

1. En tu proyecto, haz clic en **"Settings"** (arriba a la derecha)
2. En el menú lateral izquierdo, haz clic en **"Environment Variables"**

### 2.3 Agregar las Variables

#### Variable 1: Client ID

1. Haz clic en **"Add New"**
2. **Name:** `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
3. **Value:** Pega el Client ID que copiaste de PayPal
4. **Environment:** Selecciona **Production**, **Preview**, y **Development**
5. Haz clic en **"Save"**

#### Variable 2: Secret

1. Haz clic en **"Add New"** de nuevo
2. **Name:** `PAYPAL_CLIENT_SECRET`
3. **Value:** Pega el Secret que copiaste de PayPal
4. **Environment:** Selecciona **Production**, **Preview**, y **Development**
5. Haz clic en **"Save"**

---

## 🚀 Paso 3: Redesplegar la Aplicación

### 3.1 Redesplegar desde Vercel Dashboard

1. Ve a la pestaña **"Deployments"** en tu proyecto de Vercel
2. Encuentra el último deployment exitoso
3. Haz clic en los **tres puntos (...)** a la derecha
4. Selecciona **"Redeploy"**
5. Confirma el redespliegue

**O puedes redesplegar desde Git:**

```bash
git commit --allow-empty -m "Actualizar variables de entorno"
git push origin main
```

---

## ✅ Paso 4: Verificar que Todo Funcione

### 4.1 Probar la Página de Suscripciones

1. Espera 2-3 minutos a que Vercel termine el deployment
2. Ve a tu aplicación: `https://gestor-creditos-webs.vercel.app/dashboard/subscription`
3. Deberías ver los 4 planes con sus precios
4. Haz clic en **"Seleccionar Plan"** en el Plan Profesional Mensual

### 4.2 Verificar los Botones de PayPal

1. Deberías ser redirigido a: `/dashboard/subscription/checkout`
2. Deberías ver un **botón dorado de PayPal** que dice **"Subscribe"**
3. Si ves el botón, ¡las credenciales están configuradas correctamente! ✅

### 4.3 Hacer una Compra de Prueba

1. Haz clic en el botón de PayPal
2. Inicia sesión con tu cuenta de PayPal (usa una cuenta diferente a la de negocio)
3. Acepta la suscripción
4. Deberías volver a tu app
5. Verifica que tu plan se haya actualizado en el dashboard

---

## 🐛 Problemas Comunes

### El botón de PayPal no aparece

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores de PayPal
3. Verifica que `NEXT_PUBLIC_PAYPAL_CLIENT_ID` esté configurado en Vercel
4. Asegúrate de haber redeployado después de agregar las variables

### Error: "Client ID is invalid"

**Solución:**
1. Verifica que estés usando las credenciales de **Live**, no Sandbox
2. Copia de nuevo el Client ID de PayPal
3. Asegúrate de no tener espacios al inicio o final

### Error: "Plan ID not configured"

**Solución:**
1. Ve a Supabase SQL Editor
2. Ejecuta de nuevo el script `actualizar-plan-ids-paypal.sql`
3. Verifica que los Plan IDs estén guardados:

```sql
SELECT 
  nombre,
  caracteristicas->'paypal_plan_id_monthly' as plan_id_mensual,
  caracteristicas->'paypal_plan_id_yearly' as plan_id_anual
FROM planes
WHERE slug IN ('pro', 'business', 'enterprise');
```

---

## 📝 Resumen de Credenciales

| Variable | Dónde Obtenerla | Ejemplo |
|----------|----------------|---------|
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal Developer Dashboard → Apps → Live → Client ID | `AbCdEf123...` |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard → Apps → Live → Secret | `XyZ789abc...` |

---

## ⚠️ Notas Importantes

1. **Nunca compartas tu `PAYPAL_CLIENT_SECRET` públicamente**
2. Usa credenciales de **Live** (producción), no Sandbox
3. Después de agregar variables, **siempre redeploya** en Vercel
4. Los Plan IDs de PayPal ya están configurados en Supabase ✅
5. Si cambias los precios en PayPal, debes crear **nuevos planes** y actualizar los IDs

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa la consola del navegador (F12) para ver errores
2. Verifica que las variables estén en Vercel
3. Asegúrate de haber redeployado
4. Verifica que los Plan IDs estén en Supabase

---

**¡Listo!** Una vez configuradas las variables de entorno, tu sistema de suscripciones estará completamente funcional. 🎉

