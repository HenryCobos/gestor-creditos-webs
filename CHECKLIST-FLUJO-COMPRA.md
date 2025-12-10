# ✅ Checklist Completo: Flujo de Compra Hotmart

## 📋 Verificaciones Pre-Compra

### 1. Configuración en Hotmart
- [x] Webhook configurado en Hotmart → Herramientas > Webhooks
- [x] URL del webhook: `https://TU-DOMINIO.com/api/webhooks/hotmart`
- [x] Eventos activados: `PURCHASE_APPROVED`, `SUBSCRIPTION_CANCELLATION`, `REFUND`
- [x] Token (hottok) copiado de Hotmart

### 2. Variables de Entorno en Vercel
- [x] `HOTMART_WEBHOOK_SECRET` configurada con el token de Hotmart
- [x] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [x] `SUPABASE_SERVICE_ROLE_KEY` configurada
- [x] `NEXT_PUBLIC_GTM_ID` configurada (para tracking)

### 3. Configuración de Página de Agradecimiento en Hotmart
- [x] En Hotmart → Herramientas → Configuración de Página de Pago
- [x] "Página externa" seleccionada
- [x] URL configurada: `https://TU-DOMINIO.com/compra-exitosa`

### 4. Links de Hotmart
- [x] Plan Pro Mensual: `ik0qihyk` → slug `pro`
- [x] Plan Pro Anual: `r73t9021` → slug `pro`
- [x] Plan Business Mensual: `fsdgw81e` → slug `business`
- [x] Plan Business Anual: `4x3wc2e7` → slug `business`
- [x] Plan Enterprise Mensual: `axldy5u9` → slug `enterprise`
- [x] Plan Enterprise Anual: `lkmzhadk` → slug `enterprise` ✅ CORREGIDO (era 1kmzhadk con número 1)

---

## 🔄 Flujo Completo de Compra

### Paso 1: Usuario Selecciona Plan
- ✅ Usuario va a `/dashboard/subscription`
- ✅ Selecciona un plan (Pro, Business, Enterprise)
- ✅ Elige período (Mensual/Anual)
- ✅ Click en "Seleccionar Plan"
- ✅ Redirige a `/dashboard/subscription/checkout?plan={id}&period={monthly|yearly}`

### Paso 2: Página de Checkout
- ✅ Muestra resumen del plan seleccionado
- ✅ Muestra precio correcto (mensual o anual)
- ✅ Usuario autenticado (si no, redirige a login)
- ✅ Tracking: `trackBeginCheckout` se ejecuta
- ✅ Click en "Pagar Ahora"
- ✅ Genera URL de Hotmart con:
  - `email`: Email del usuario
  - `sck`: ID del usuario (UUID de Supabase)
  - `checkoutMode=10`
- ✅ Redirige a Hotmart

### Paso 3: Pago en Hotmart
- ✅ Usuario completa el pago en Hotmart
- ✅ Hotmart procesa el pago
- ✅ Hotmart aprueba la compra

### Paso 4: Webhook de Hotmart (AUTOMÁTICO)
- ✅ Hotmart envía `PURCHASE_APPROVED` a `/api/webhooks/hotmart`
- ✅ Webhook valida token `HOTMART_WEBHOOK_SECRET` (si está configurado)
- ✅ Webhook identifica usuario por:
  - `sck` (Source Key) = UUID del usuario, O
  - Email del comprador (fallback)
- ✅ Webhook identifica plan por código de oferta (`off`)
- ✅ Webhook actualiza `profiles` en Supabase:
  - `plan_id`: ID del plan comprado
  - `subscription_status`: 'active'
  - `subscription_period`: 'monthly' o 'yearly'
  - `subscription_start_date`: Fecha actual
  - `subscription_end_date`: Fecha + 1 mes/año
  - `payment_method`: 'hotmart'
  - `hotmart_subscription_id`: ID de suscripción de Hotmart

### Paso 5: Redirección a Página de Agradecimiento
- ✅ Hotmart redirige a `/compra-exitosa`
- ✅ Página carga plan actual del usuario
- ✅ Muestra beneficios específicos del plan comprado
- ✅ Tracking: Evento `Purchase` se envía a GTM/TikTok
- ✅ Usuario ve confirmación personalizada

### Paso 6: Verificación en Dashboard
- ✅ Usuario va a `/dashboard`
- ✅ Dashboard carga plan actualizado
- ✅ Muestra límites correctos del plan (50 clientes, 50 préstamos para Pro)
- ✅ Funciones desbloqueadas según el plan

---

## 🐛 Posibles Problemas y Soluciones

### Problema 1: Webhook no llega
**Síntomas:** Plan no se actualiza automáticamente
**Soluciones:**
- Verificar que webhook esté configurado en Hotmart
- Verificar que `HOTMART_WEBHOOK_SECRET` esté en Vercel
- Revisar logs de Vercel para ver si llegó el webhook
- Usar página `/activar-plan-pro` como fallback manual

### Problema 2: Usuario no se identifica
**Síntomas:** Webhook llega pero no actualiza el plan
**Soluciones:**
- Verificar que `sck` se esté enviando correctamente en checkout
- Verificar que email del comprador coincida con email en Supabase
- Revisar logs del webhook para ver qué datos recibió

### Problema 3: Plan incorrecto asignado
**Síntomas:** Se asigna plan diferente al comprado
**Soluciones:**
- Verificar mapeo de códigos de oferta en `OFFER_CODE_TO_PLAN`
- Verificar que slugs en base de datos coincidan (pro, business, enterprise)

### Problema 4: Página de agradecimiento muestra plan incorrecto
**Síntomas:** Muestra "Gratuito" en lugar del plan comprado
**Soluciones:**
- Esperar unos segundos (webhook puede tardar)
- Recargar la página
- Verificar que webhook se ejecutó correctamente

---

## ✅ Checklist Post-Compra (Para tu Prueba)

Después de hacer tu compra de prueba, verifica:

1. **En Hotmart:**
   - [ ] Compra aparece como "Aprobada"
   - [ ] Recibiste email de confirmación

2. **En Vercel Logs:**
   - [ ] Webhook recibió evento `PURCHASE_APPROVED`
   - [ ] Logs muestran: "✅ Usuario [ID] actualizado a plan [slug]"
   - [ ] No hay errores en los logs

3. **En tu Dashboard:**
   - [ ] Plan actualizado a Pro/Business/Enterprise
   - [ ] Límites correctos (50/200/ilimitado según plan)
   - [ ] Funciones desbloqueadas

4. **En Página de Agradecimiento:**
   - [ ] Muestra plan correcto
   - [ ] Muestra beneficios correctos
   - [ ] Colores corresponden al plan

5. **En Tracking:**
   - [ ] Evento `Purchase` aparece en GTM
   - [ ] Evento `Purchase` aparece en TikTok Events Manager

---

## 🎯 Estado Actual del Sistema

✅ **Funcionando:**
- Checkout y redirección a Hotmart
- Webhook con logging detallado
- Identificación de usuario (sck + email fallback)
- Mapeo de códigos de oferta a planes
- Página de agradecimiento personalizada
- Tracking de eventos (GTM/TikTok)
- Página de activación manual (fallback)

⚠️ **A Verificar en Prueba:**
- Tiempo de respuesta del webhook
- Que el webhook identifique correctamente al usuario
- Que la página de agradecimiento cargue el plan actualizado

---

## 📝 Notas Importantes

1. **Retraso Normal:** El webhook puede tardar 30-60 segundos después de la aprobación del pago
2. **Pagos en Efectivo:** Pueden tardar 1-3 días en aprobarse (Hotmart enviará webhook cuando se apruebe)
3. **Fallback Manual:** Si el webhook falla, usar `/activar-plan-pro` para activar manualmente
4. **Logs:** Siempre revisar logs de Vercel si algo no funciona

