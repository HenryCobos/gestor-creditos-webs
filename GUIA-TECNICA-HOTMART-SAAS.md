# 🚀 Guía Técnica: Integración Hotmart para SaaS (Definitiva)

## 📋 Resumen de Arquitectura

A diferencia de PayPal/Stripe donde el usuario paga dentro de nuestra web, en Hotmart el flujo es:
1. Usuario elige plan en tu Dashboard.
2. Redirigimos al **Checkout de Hotmart** pasando sus datos (Email + ID).
3. Usuario paga en Hotmart (Tarjeta, PIX, Efectivo, etc.).
4. Hotmart envía un **Webhook** a nuestro servidor.
5. Nuestro servidor activa el plan en la base de datos.

---

## 🛠️ PASO 1: Configuración en Hotmart

### 1. Crear el Producto
1. Entra a Hotmart > Productos > Registrar Producto.
2. Elige **"Suscripción"**.
3. Nombre: "Gestor de Créditos SaaS".
4. Área de Miembros: Elige "Área de Miembros Externa" (porque el software es tu web).

### 2. Crear los Planes (Ofertas)
Necesitas crear una "Oferta" por cada plan que tenemos en base de datos:

| Tu Plan (Supabase) | Hotmart (Oferta) | Precio | Periodicidad |
|-------------------|------------------|--------|--------------|
| Profesional Mensual | Crear Plan Pro M | $19 | 1 Mes |
| Profesional Anual | Crear Plan Pro A | $190 | 12 Meses |
| Business Mensual | Crear Plan Biz M | $49 | 1 Mes |
| ... | ... | ... | ... |

**IMPORTANTE:** Al crear la oferta, copia el **Link de Checkout** de cada una.

---

## 💻 PASO 2: Integración en el Código (Frontend)

No usaremos el SDK de botones. Usaremos redirección directa con parámetros para rastrear al usuario.

### Archivo: `lib/hotmart.ts` (Nuevo)

```typescript
export const HOTMART_LINKS = {
  pro_monthly: 'https://pay.hotmart.com/XYZ123?off=CODE1',
  pro_yearly: 'https://pay.hotmart.com/XYZ123?off=CODE2',
  business_monthly: 'https://pay.hotmart.com/XYZ123?off=CODE3',
  // ...
}

export function getHotmartCheckoutUrl(planSlug: string, period: string, userEmail: string, userId: string) {
  const key = `${planSlug}_${period}` // ej: pro_monthly
  const baseUrl = HOTMART_LINKS[key]
  
  if (!baseUrl) return null

  // Agregamos parámetros clave:
  // email: Pre-llena el email del usuario
  // sck: Source Key (usaremos esto para enviar el USER_ID y recuperarlo en el webhook)
  // checkoutMode: 10 (para que se vea limpio)
  return `${baseUrl}&email=${userEmail}&sck=${userId}&checkoutMode=10`
}
```

### Archivo: `app/dashboard/subscription/checkout/page.tsx`

Reemplazamos los botones de PayPal por un botón simple:

```tsx
// Al hacer click en "Suscribirse"
const handleSubscribe = () => {
  const url = getHotmartCheckoutUrl(plan.slug, period, user.email, user.id)
  window.location.href = url // Redirección al checkout seguro de Hotmart
}
```

---

## 🔗 PASO 3: El Webhook (El Corazón del Sistema)

Necesitamos crear una API Route en Next.js que reciba las notificaciones de Hotmart.

### Archivo: `app/api/webhooks/hotmart/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Eventos que nos importan de Hotmart
const EVENTS = {
  APPROVED: 'PURCHASE_APPROVED',
  CANCELLED: 'SUBSCRIPTION_CANCELLATION',
  SWITCH_PLAN: 'SWITCH_PLAN',
  REFUNDED: 'REFUND'
}

export async function POST(req: Request) {
  const token = req.headers.get('hottok') // Token de seguridad de Hotmart
  
  if (token !== process.env.HOTMART_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { event, data } = body
  
  // El "sck" que enviamos en el checkout vuelve aquí en "x_source" o "sck"
  // Nota: A veces Hotmart lo devuelve en metadata. Hay que revisar payload real.
  // Asumiremos que logramos recuperar el userId del parámetro sck.
  const userId = data.purchase.sck || data.buyer.email // Fallback al email si falla sck
  
  const supabase = createClient(...)

  if (event === EVENTS.APPROVED) {
    // 1. Identificar qué plan compró
    const offerCode = data.purchase.offer_code
    const plan = mapOfferCodeToPlan(offerCode) // Función helper
    
    // 2. Activar suscripción en DB
    await supabase.from('profiles').update({
      plan_id: plan.id,
      subscription_status: 'active',
      subscription_end_date: calculateEndDate(plan.period), // +1 mes o +1 año
      payment_method: 'hotmart',
      hotmart_subscription_id: data.subscription.subscriber_code
    }).eq('id', userId)
  }

  if (event === EVENTS.CANCELLED || event === EVENTS.REFUNDED) {
    // Desactivar o bajar a plan Free
    await supabase.from('profiles').update({
      plan_id: PLAN_FREE_ID,
      subscription_status: 'cancelled'
    }).eq('id', userId)
  }

  return NextResponse.json({ received: true })
}
```

---

## 📝 PASO 4: Configurar el Webhook en Hotmart

1. Ve a Hotmart Developers > Webhooks (o Herramientas > Webhook).
2. Crear nueva configuración.
3. **URL:** `https://tu-dominio.com/api/webhooks/hotmart`
4. **Eventos:** Selecciona "Compra Aprobada", "Cancelación de Suscripción", "Cambio de Plan", "Reembolso".
5. **Token (hottok):** Copia este token y ponlo en tus variables de entorno en Vercel (`HOTMART_WEBHOOK_SECRET`).

---

## ⚠️ Consideraciones Finales

1.  **Retraso en Activación:** La activación no es "instantánea" en la UI del usuario. Paga en Hotmart -> Hotmart envía Webhook -> Tu servidor procesa -> Usuario debe refrescar.
    *   *Solución:* Página de "Gracias" que diga "Estamos procesando tu pago, en unos minutos tu plan estará activo".

2.  **Pagos en Efectivo (OXXO, Boleto):**
    *   Estos tardan 1-3 días en aprobarse.
    *   Hotmart enviará el evento `PURCHASE_APPROVED` solo cuando el pago se confirme realmente.

3.  **Emails:**
    *   Hotmart envía emails de recibo automáticamente.
    *   Tú debes enviar el email de "Bienvenido a Pro" cuando recibas el webhook.

## ✅ Conclusión

**SÍ, haz el cambio.**
Hotmart te resuelve toda la facturación compleja de LATAM. La integración técnica es de dificultad media (nivel Webhook), pero una vez configurada es muy estable.

