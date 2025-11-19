# 🔧 ACTUALIZAR CREDENCIALES DE PAYPAL A LIVE/PRODUCCIÓN

## 🚨 PROBLEMA ACTUAL:
Estás usando credenciales de **SANDBOX** (pruebas) en producción.
PayPal rechaza estas credenciales con error 400.

---

## ✅ SOLUCIÓN - Paso a Paso:

### 1️⃣ OBTENER CREDENCIALES LIVE DE PAYPAL

1. **Ve a:** https://developer.paypal.com/dashboard/
2. **Inicia sesión**
3. **Cambia a modo "Live"** (arriba a la derecha, NO "Sandbox")
4. **Ve a "Apps & Credentials"**
5. **Asegúrate de estar en la pestaña "Live"** (arriba)

#### Si NO tienes una App en Live:
- Click **"Create App"**
- Nombre: `Gestor Creditos Web`
- Click **"Create App"**

#### Si YA tienes una App:
- Click en el nombre de tu App

6. **Copia el "Client ID"** (empieza con AXxxx o AVxxx)
7. **Click en "Show" debajo de "Secret"**
8. **Copia el "Secret"**

---

### 2️⃣ ACTUALIZAR EN VERCEL

#### Opción A: Desde el Dashboard de Vercel

1. **Ve a Vercel:** https://vercel.com/
2. **Selecciona tu proyecto:** `gestor-creditos-webs`
3. **Ve a:** Settings → Environment Variables
4. **Actualiza estas 2 variables:**

   **Variable 1:** `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - Click en `...` → Edit
   - **Pega tu Client ID de LIVE** (el que copiaste)
   - Save

   **Variable 2:** `PAYPAL_CLIENT_SECRET`
   - Click en `...` → Edit
   - **Pega tu Secret de LIVE** (el que copiaste)
   - Save

5. **Ve a:** Deployments
6. **Click en el deployment más reciente**
7. **Click en `...` (tres puntos)** → **Redeploy**
8. **Espera 2-3 minutos** hasta que diga "Ready"

---

### 3️⃣ PROBAR

1. **Abre tu sitio en modo incógnito**
2. **Recarga con Ctrl+Shift+R**
3. **Ve a Ver Planes**
4. **Selecciona cualquier plan**
5. **Deberías ver los botones de PayPal** ✅

---

## 🔍 DIFERENCIAS ENTRE SANDBOX Y LIVE:

| Aspecto | Sandbox (Pruebas) | Live (Producción) |
|---------|------------------|-------------------|
| Client ID | ASH29gb1zk... | AXxxx o AVxxx |
| URL SDK | sandbox.paypal.com | www.paypal.com |
| Pagos reales | ❌ NO | ✅ SÍ |
| Planes | Solo pruebas | Los que creaste |
| Uso | Desarrollo | Producción |

---

## ⚠️ IMPORTANTE:

1. **Nunca compartas públicamente** tus credenciales LIVE
2. **Guárdalas en un lugar seguro** (password manager)
3. **NO las pongas en el código** (solo en variables de entorno)
4. **Los pagos en LIVE son reales** - los clientes sí pagarán

---

## 📊 CHECKLIST:

- [ ] Obtuve Client ID de LIVE (no Sandbox)
- [ ] Obtuve Secret de LIVE (no Sandbox)
- [ ] Actualicé `NEXT_PUBLIC_PAYPAL_CLIENT_ID` en Vercel
- [ ] Actualicé `PAYPAL_CLIENT_SECRET` en Vercel
- [ ] Hice Redeploy en Vercel
- [ ] Esperé a que el deployment esté "Ready"
- [ ] Probé en modo incógnito
- [ ] Los botones de PayPal aparecen ✅

---

## 🆘 SI SIGUES TENIENDO PROBLEMAS:

1. **Abre DevTools (F12)** → Console
2. **Toma screenshot del error**
3. **Muéstramelo**

---

## 📞 SOPORTE:

Si el error persiste después de seguir estos pasos, es posible que:
- Tu cuenta de PayPal no esté verificada para Live
- Necesites activar las APIs de suscripciones en tu cuenta de PayPal
- Necesites completar el proceso de verificación de negocio en PayPal

En ese caso, contacta a PayPal Support.

