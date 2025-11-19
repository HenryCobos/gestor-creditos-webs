# ⚡ Instrucciones Rápidas: Configurar Tracking

## 📝 RESUMEN

Necesitas configurar 4 cosas antes de crear campañas de Google Ads:

1. ✅ Google Analytics 4 (GA4)
2. ✅ Píxel de Google Ads
3. ✅ 2 Conversiones en Google Ads
4. ✅ Variables de entorno en Vercel

**Tiempo:** 2-3 horas

---

## 🚀 PASO A PASO RÁPIDO

### 1️⃣ Google Analytics 4 (15 minutos)

```
1. https://analytics.google.com
2. Crear → Propiedad → "GestorPro"
3. Flujo de datos → Web → https://gestor-creditos-webs.vercel.app
4. COPIAR ID: G-XXXXXXXXXX
```

### 2️⃣ Google Ads - ID Principal (5 minutos)

```
1. https://ads.google.com
2. Herramientas → Medición → Conversiones
3. Anotar tu ID de cuenta: AW-XXXXXXXXXX
```

### 3️⃣ Conversión #1: Registro (15 minutos)

```
1. Nueva acción de conversión → Sitio web
2. Nombre: "Registro Completado"
3. Valor: $5.00 USD (fijo)
4. Categoría: Registro
5. Incluir en conversiones: SÍ
6. COPIAR ID completo: AW-XXXXXXXXXX/xxxxxxxxxxxxx
```

### 4️⃣ Conversión #2: Suscripción (15 minutos)

```
1. Nueva acción de conversión → Sitio web
2. Nombre: "Suscripción de Pago"
3. Valor: Variable (marcar "usar valores diferentes")
4. Valor predeterminado: $19.00 USD
5. Categoría: Compra
6. Incluir en conversiones: SÍ
7. COPIAR ID completo: AW-XXXXXXXXXX/yyyyyyyyyyyyy
```

### 5️⃣ Agregar Variables de Entorno (10 minutos)

**A. Agrega al archivo `.env.local`:**

```bash
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Ads
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP=AW-XXXXXXXXXX/xxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE=AW-XXXXXXXXXX/yyyyyyyyyyyyy
```

**B. Agrega a Vercel:**

```
1. https://vercel.com → Tu proyecto
2. Settings → Environment Variables
3. Agregar las 4 variables de arriba
4. Save
```

### 6️⃣ Desplegar (5 minutos)

```bash
git add .
git commit -m "Agregar tracking GA4 y Google Ads"
git push origin main
```

Espera 2-3 minutos para que Vercel despliegue.

---

## ✅ VERIFICAR

### Google Analytics Funciona:

```
1. https://analytics.google.com → Tiempo real
2. Abre tu sitio en otra pestaña
3. Deberías ver 1 usuario activo ✅
```

### Google Ads Píxel Funciona:

```
1. Instala extensión: "Google Tag Assistant"
2. Abre tu sitio
3. Clic en extensión
4. Deberías ver: Google Ads tag detectado ✅
```

---

## 🎯 ¿QUÉ SE RASTREA?

| Evento | Cuándo | Valor |
|--------|--------|-------|
| **Registro Completado** | Usuario se registra gratis | $5 |
| **Suscripción de Pago** | Usuario compra plan | $19-179 |
| CTA Clicks | Usuario hace clic en botones | - |
| View Pricing | Usuario ve página de precios | - |

---

## 📊 PRÓXIMOS PASOS

Una vez funcionando:

1. ✅ **Espera 24 horas** para que Google procese datos
2. ✅ **Verifica conversiones** haciendo registro de prueba
3. ✅ **Crea campañas** siguiendo: `CONFIGURACION-GOOGLE-ADS-PASO-A-PASO.md`

---

## ⚠️ IMPORTANTE

- **NO crees campañas sin tracking** - perderás dinero sin saber qué funciona
- **Espera datos suficientes** antes de optimizar (mínimo 20-30 conversiones)
- **Revisa diariamente** los primeros 7 días

---

**Guía completa:** `GUIA-CONFIGURACION-TRACKING.md`

