# 🔧 Configuración Actual - Variables de Entorno

## ✅ Google Analytics 4 - CONFIGURADO

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-DH3DL689D2
```

**Estado:** ✅ ID obtenido

---

## 🔑 Variables de Entorno (Actualizadas)

### Producción (Vercel)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zohckw...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Hotmart (Nuevo Sistema de Pagos)
HOTMART_WEBHOOK_SECRET=hottok_... (Token de seguridad de Hotmart)

# RevenueCat (App iOS)
REVENUECAT_API_KEY_IOS=appl_...

# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-DH3DL689D2
```

---

## ⏳ Google Ads - PENDIENTE

Necesitas configurar estas 3 variables:

```bash
# ID principal de Google Ads
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX

# Conversión: Registro Completado
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP=AW-XXXXXXXXXX/xxxxxxxxxxxxx

# Conversión: Suscripción de Pago
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE=AW-XXXXXXXXXX/yyyyyyyyyyyyy
```

---

## 📝 PRÓXIMOS PASOS

### 1. Agregar Webhook Secret a Vercel
Cuando Hotmart apruebe tu producto, te darán un token (hottok). Debes agregarlo en Vercel con el nombre: `HOTMART_WEBHOOK_SECRET`

### 2. Configurar Conversiones en Google Ads
Sigue los pasos en tu cuenta de Google Ads para obtener los IDs de conversión y agregarlos a Vercel.

---

## ✅ PROGRESO ACTUAL

```
[✅] Integración Hotmart completada (Código + DB)
[✅] Limpieza de código PayPal realizada
[✅] Google Analytics 4 ID obtenido: G-DH3DL689D2
[⏳] Agregar variables a Vercel
[⏳] Esperar aprobación de producto en Hotmart
```
