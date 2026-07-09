# Guía GTM — TikTok Pixel con parámetros EMQ

El código empuja eventos al `dataLayer`. GTM debe mapear esos parámetros a los tags de TikTok Pixel.

## Eventos del dataLayer

| event (dataLayer) | Evento TikTok | Cuándo se dispara |
|-------------------|---------------|-------------------|
| `page_view` | PageView | Cada cambio de ruta (`RouteChangeListener`) |
| `CompleteRegistration` | CompleteRegistration | Registro exitoso (`/register`) |
| `InitiateCheckout` | InitiateCheckout | Click que redirige a Hotmart |
| `Purchase` | CompletePayment / Purchase | `/compra-exitosa` (backup browser) |
| `ViewContent` | ViewContent | Scroll a pricing landing o paso 3 onboarding |

## Parámetros disponibles por evento

### InitiateCheckout y Purchase

```js
{
  event: 'InitiateCheckout', // o 'Purchase'
  value: 49,                 // USD
  currency: 'USD',
  content_id: 'business',    // pro | business | enterprise
  content_name: 'Plan Business',
  content_type: 'product',
  billing_period: 'monthly', // solo InitiateCheckout
  transaction_id: '...'      // solo Purchase (opcional)
}
```

### CompleteRegistration

```js
{
  event: 'CompleteRegistration',
  user_id: 'uuid',
  user_email: 'usuario@email.com'  // GTM puede hashear SHA256 para EMQ
}
```

### ViewContent

```js
{
  event: 'ViewContent',
  content_id: 'pricing',           // o 'onboarding-plans'
  content_name: 'Planes Gestor de Créditos',
  content_type: 'product'
}
```

## Configuración en GTM

### 1. Variables de capa de datos (Data Layer Variables)

Crear variables con estos nombres:

| Nombre variable GTM | Nombre capa de datos |
|---------------------|----------------------|
| `dlv - value` | `value` |
| `dlv - currency` | `currency` |
| `dlv - content_id` | `content_id` |
| `dlv - content_name` | `content_name` |
| `dlv - content_type` | `content_type` |
| `dlv - user_email` | `user_email` |
| `dlv - transaction_id` | `transaction_id` |

### 2. Triggers personalizados

| Trigger | Tipo | Event name |
|---------|------|------------|
| TikTok - CompleteRegistration | Custom Event | `CompleteRegistration` |
| TikTok - InitiateCheckout | Custom Event | `InitiateCheckout` |
| TikTok - Purchase | Custom Event | `Purchase` |
| TikTok - ViewContent | Custom Event | `ViewContent` |

**Importante:** Eliminar o desactivar triggers antiguos que disparaban CompleteRegistration en `/dashboard` o InitiateCheckout al visitar `/dashboard/subscription*`.

### 3. Tags TikTok — mapeo de parámetros

En cada tag de evento TikTok, agregar:

**InitiateCheckout:**
- Event parameter `value` → `{{dlv - value}}`
- Event parameter `currency` → `{{dlv - currency}}`
- Event parameter `content_id` → `{{dlv - content_id}}`
- Event parameter `content_type` → `product`

**Purchase / CompletePayment:**
- `value` → `{{dlv - value}}`
- `currency` → `{{dlv - currency}}`
- `content_id` → `{{dlv - content_id}}`
- `content_type` → `product`

**CompleteRegistration (EMQ):**
- Si el tag TikTok soporta Advanced Matching, mapear email hasheado SHA256 desde `user_email`.
- Alternativa: usar variable GTM Custom JavaScript que hashee el email antes de enviarlo.

### 4. Verificación

1. GTM Preview → registrar usuario → debe disparar **solo** CompleteRegistration (no al entrar al dashboard).
2. Click en plan Hotmart → InitiateCheckout con `value` y `content_id` correctos.
3. Compra de prueba → verificar CompletePayment en TikTok Events Manager (server-side vía webhook + backup browser).

## Server-side (Events API)

Las ventas reales se envían desde el webhook Hotmart (`lib/tiktok-events-api.ts`) con evento `CompletePayment`. No requiere GTM.

Variables en Vercel:
- `TIKTOK_PIXEL_ID`
- `TIKTOK_ACCESS_TOKEN`

Sincronizar: `node scripts/sync-vercel-env.mjs --push`
