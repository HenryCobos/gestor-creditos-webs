# 🔴 Solucionar Error de PayPal en Checkout

## Error Reportado:
```
Error de PayPal
Hubo un problema al procesar la suscripción. Por favor intenta nuevamente.
```

---

## 🔍 DIAGNÓSTICO (Sigue en orden)

### ✅ PASO 1: Verificar Variables de Entorno en Vercel

1. **Ve a:** https://vercel.com
2. **Selecciona tu proyecto:** gestor-creditos-webs
3. **Click en:** Settings → Environment Variables
4. **Verifica que existen:**

| Variable | Valor Esperado |
|----------|---------------|
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Tu Client ID de PayPal (Live) - empieza con "A" |
| `PAYPAL_CLIENT_SECRET` | Tu Secret de PayPal (Live) |

**Si NO están configuradas:**
1. Click en "Add New"
2. Agrega ambas variables
3. **IMPORTANTE:** Selecciona los 3 ambientes (Production, Preview, Development)
4. Click en "Save"
5. **Redeploy tu aplicación** (Settings → Deployments → Latest → "Redeploy")

---

### ✅ PASO 2: Verificar que usas Credenciales LIVE (no Sandbox)

**El error más común es usar credenciales de Sandbox en producción.**

1. **Ve a:** https://developer.paypal.com/dashboard/
2. **Asegúrate que el toggle esté en "Live"** (arriba a la derecha)
3. **Ve a:** Apps & Credentials
4. **Click en tu app** (o crea una si no existe)
5. **Copia el Client ID y Secret de la sección LIVE**

**IMPORTANTE:** 
- ❌ NO uses las credenciales de "Sandbox"
- ✅ USA las credenciales de "Live"

---

### ✅ PASO 3: Verificar Plan IDs en Base de Datos

**Ejecuta este query en Supabase SQL Editor:**

```sql
SELECT 
  nombre,
  slug,
  caracteristicas->>'paypal_plan_id_monthly' as plan_id_monthly,
  caracteristicas->>'paypal_plan_id_yearly' as plan_id_yearly,
  activo
FROM planes
WHERE slug IN ('pro', 'business', 'enterprise')
ORDER BY orden;
```

**Resultado esperado:**
- Cada plan debe tener `plan_id_monthly` y `plan_id_yearly`
- Ambos deben empezar con "P-"
- Todos deben tener `activo = true`

**Si los Plan IDs están vacíos o incorrectos:**
- Ejecuta nuevamente el script: `supabase/actualizar-plan-ids-paypal.sql`

---

### ✅ PASO 4: Verificar Planes en PayPal

1. **Ve a:** https://www.paypal.com
2. **Inicia sesión** con tu cuenta de negocio
3. **Ve a:** Products & Services → Subscriptions
4. **Verifica que tus 6 planes:**
   - Profesional Mensual
   - Profesional Anual
   - Business Mensual
   - Business Anual
   - Enterprise Mensual
   - Enterprise Anual

**Todos deben estar:**
- ✅ Estado: **ACTIVE**
- ✅ Modo: **Live** (no Sandbox)

---

### ✅ PASO 5: Verificar en Consola del Navegador

1. **Abre tu sitio** en el navegador
2. **Presiona F12** (abre DevTools)
3. **Ve a la pestaña "Console"**
4. **Intenta suscribirte** de nuevo
5. **Busca errores** en rojo en la consola

**Errores comunes:**
- `Invalid client_id` → Credenciales incorrectas
- `Plan not found` → Plan ID incorrecto
- `Plan not active` → Plan desactivado en PayPal

---

## 🔧 SOLUCIONES RÁPIDAS

### Solución 1: Credenciales no configuradas

```bash
# En Vercel, agrega:
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AQabcdefgh123...
PAYPAL_CLIENT_SECRET=ELabcdefgh456...
```

### Solución 2: Usando Sandbox en vez de Live

1. Ve a PayPal Developer Dashboard
2. Cambia de "Sandbox" a "Live"
3. Copia las nuevas credenciales
4. Actualízalas en Vercel

### Solución 3: Plan IDs incorrectos

Ejecuta en Supabase:

```sql
-- Ejemplo para Plan Profesional Mensual
UPDATE planes
SET caracteristicas = jsonb_set(
  caracteristicas,
  '{paypal_plan_id_monthly}',
  '"P-TU_PLAN_ID_AQUI"'::jsonb
)
WHERE slug = 'pro';
```

---

## 🧪 PROBAR DESPUÉS DE CORREGIR

1. **Cierra sesión** de tu cuenta
2. **Abre una ventana incógnito**
3. **Registra una cuenta nueva**
4. **Intenta suscribirte** al plan Profesional
5. **Verifica** que el botón de PayPal funcione

---

## 📞 VERIFICACIÓN FINAL

Ejecuta este checklist:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Credenciales son de LIVE (no Sandbox)
- [ ] Plan IDs correctos en Supabase
- [ ] Planes activos en PayPal
- [ ] Redeploy realizado después de cambios
- [ ] Prueba en ventana incógnito funcionando

---

## ⚠️ NOTA IMPORTANTE

Si cambiaste las credenciales en Vercel, **DEBES hacer un redeploy**:

1. Ve a Vercel → Deployments
2. Click en el último deploy
3. Click en "⋮" (tres puntos)
4. Click en "Redeploy"
5. Espera que termine

Las variables de entorno **NO se aplican automáticamente** a deploys existentes.

---

## 🆘 SI SIGUE SIN FUNCIONAR

Envíame:
1. Screenshot del error en consola (F12 → Console)
2. Confirmación de que las variables están en Vercel
3. Confirmación de que usas credenciales Live

---

**Última actualización:** Noviembre 2025

