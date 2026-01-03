# 🔍 Análisis: Por qué no se activa el plan con cupones de descuento

## 📊 Problema Identificado

Cuando un usuario compra con cupón de descuento, el webhook de Hotmart **NO activa automáticamente** el plan, pero **SÍ funciona** cuando no hay cupón.

## 🔎 Causas Probables

### 1. **Código de Oferta Diferente con Cupones** ⚠️ (MÁS PROBABLE)

Hotmart puede generar un **código de oferta diferente** cuando se aplica un cupón de descuento. 

**Ejemplo:**
- Sin cupón: `ik0qihyk` → Plan Profesional ✅
- Con cupón 50%: `ik0qihyk_COUPON_50` o código completamente diferente ❌

**Ubicación en el código:**
```typescript
// Línea 132-133
const offerCode = data.purchase?.offer?.code || data.purchase?.pricing?.offer?.code
const planInfo = OFFER_CODE_TO_PLAN[offerCode as keyof typeof OFFER_CODE_TO_PLAN]

if (!planInfo) {
  console.warn(`⚠️ Código de oferta desconocido: ${offerCode}`)
  return NextResponse.json({ warning: 'Unknown offer code' })
}
```

**Si el código no está en el mapeo, el webhook retorna un warning y NO actualiza el plan.**

---

### 2. **Estructura del Webhook Cambia con Cupones**

Cuando hay un cupón, Hotmart puede cambiar la estructura del JSON:

**Sin cupón:**
```json
{
  "purchase": {
    "offer": {
      "code": "ik0qihyk"
    }
  }
}
```

**Con cupón:**
```json
{
  "purchase": {
    "pricing": {
      "offer": {
        "code": "ik0qihyk"
      },
      "discount": {
        "coupon": "50OFF"
      }
    }
  }
}
```

El código actual intenta ambos lugares, pero podría haber más variaciones.

---

### 3. **Evento Diferente**

Hotmart podría enviar un **evento diferente** cuando hay cupón:
- Sin cupón: `PURCHASE_APPROVED` ✅
- Con cupón: `PURCHASE_APPROVED_WITH_COUPON` o similar ❌

**Ubicación en el código:**
```typescript
// Línea 130
if (event === EVENTS.APPROVED || event === EVENTS.SUBSCRIPTION_RENEWED || ...) {
  // Solo procesa si el evento coincide
}
```

---

### 4. **Usuario No Identificado Correctamente**

Si el email o `sck` no coinciden, el webhook no puede encontrar al usuario:

**Ubicación en el código:**
```typescript
// Línea 106-122
if (!targetUserId && userEmail) {
  // Busca por email en profiles
  // Si no existe, retorna error 404
}

if (!targetUserId) {
  return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
}
```

---

### 5. **El Webhook No Se Ejecutó**

Posibles razones:
- El webhook falló silenciosamente
- Error de red entre Hotmart y tu servidor
- El webhook fue bloqueado por seguridad
- Timeout del webhook

---

## ✅ Soluciones Recomendadas

### Solución 1: Mejorar el Logging del Webhook

Agregar más logs para identificar exactamente qué está pasando:

```typescript
// Agregar después de línea 69
console.log('🎫 Código de oferta completo:', {
  'purchase.offer.code': data.purchase?.offer?.code,
  'purchase.pricing.offer.code': data.purchase?.pricing?.offer?.code,
  'purchase.offer': data.purchase?.offer,
  'purchase.pricing': data.purchase?.pricing,
  'tiene_cupon': !!(data.purchase?.pricing?.discount || data.purchase?.coupon),
  'monto_original': data.purchase?.original_offer_price?.value,
  'monto_final': data.purchase?.price?.value
})
```

### Solución 2: Mapeo Más Flexible de Códigos

Si Hotmart genera códigos diferentes con cupones, necesitas:

1. **Identificar el código base** (antes del cupón)
2. **Mapear códigos con cupones** a los planes correctos

```typescript
// Extraer código base (remover sufijos de cupón)
const extractBaseOfferCode = (code: string) => {
  // Si el código tiene formato "ik0qihyk_COUPON_50", extraer "ik0qihyk"
  return code.split('_')[0] || code
}

const offerCode = data.purchase?.offer?.code || data.purchase?.pricing?.offer?.code
const baseOfferCode = extractBaseOfferCode(offerCode)
const planInfo = OFFER_CODE_TO_PLAN[baseOfferCode as keyof typeof OFFER_CODE_TO_PLAN]
```

### Solución 3: Fallback por Monto Pagado

Si el código de oferta no coincide, usar el monto pagado como fallback:

```typescript
// Si no se encuentra el plan por código, intentar por monto
if (!planInfo) {
  const amount = data.purchase?.price?.value || 0
  // $9.50 = Plan Profesional con 50% descuento
  // $19 = Plan Profesional normal
  if (amount >= 9 && amount <= 10) {
    planInfo = { slug: 'pro', period: 'monthly' }
  } else if (amount >= 19 && amount <= 20) {
    planInfo = { slug: 'pro', period: 'monthly' }
  }
  // ... más rangos
}
```

### Solución 4: Verificar Logs de Vercel

Revisar los logs de Vercel para ver:
- ¿Se recibió el webhook?
- ¿Qué código de oferta se recibió?
- ¿Hubo algún error?

---

## 🎯 Acción Inmediata Recomendada

1. **Revisar logs de Vercel** para el webhook de Hotmart
2. **Buscar el webhook recibido** para `barriosyerson0@gmail.com`
3. **Verificar el código de oferta** que se recibió
4. **Agregar el código faltante** al mapeo si es diferente

---

## 📝 Próximos Pasos

1. Mejorar el logging del webhook (Solución 1)
2. Implementar mapeo flexible (Solución 2)
3. Agregar fallback por monto (Solución 3)
4. Monitorear logs para identificar patrones

---

## 🔧 Script de Verificación

Para verificar qué está pasando, ejecuta este script SQL después de revisar los logs:

```sql
-- Verificar si el webhook intentó actualizar el usuario
SELECT 
  u.email,
  p.updated_at as ultima_actualizacion,
  p.hotmart_subscription_id,
  p.payment_method,
  pl.slug as plan_actual
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN planes pl ON p.plan_id = pl.id
WHERE u.email = 'barriosyerson0@gmail.com';
```

Si `ultima_actualizacion` no cambió después de la compra, el webhook NO se ejecutó o falló.

