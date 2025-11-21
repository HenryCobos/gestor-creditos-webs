# 🔧 Configuración Actual - Variables de Entorno

## ✅ Google Analytics 4 - CONFIGURADO

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-DH3DL689D2
```

**Estado:** ✅ ID obtenido

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

### 1. Agregar GA4 a Vercel (5 minutos)

1. Ve a: https://vercel.com/dashboard
2. Selecciona proyecto: **gestor-creditos-webs**
3. Ve a: **Settings** → **Environment Variables**
4. Clic en **"Add New"**
5. Agrega:
   - **Name:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - **Value:** `G-DH3DL689D2`
   - **Environments:** Marca todas (Production, Preview, Development)
6. Clic en **"Save"**

### 2. Configurar Conversiones en Google Ads (30-40 minutos)

Sigue estos pasos en tu cuenta de Google Ads:

#### A. Obtener ID Principal de Google Ads

1. Ve a: https://ads.google.com
2. Haz clic en **"Herramientas y configuración"** (ícono de llave arriba)
3. En la columna **"Medición"**, clic en **"Conversiones"**
4. Si ya ves conversiones creadas, salta al paso B
5. Si es tu primera vez, clic en **"+ Nueva acción de conversión"**

#### B. Crear Conversión #1: "Registro Completado"

**Esta conversión rastrea cuando alguien se registra gratis**

1. Clic en **"+ Nueva acción de conversión"**
2. Selecciona: **"Sitio web"**
3. Clic en: **"Agregar manualmente una acción de conversión"** (no uses el asistente automático)
4. Configura así:

```
Categoría: Registro
Nombre de conversión: Registro Completado
Valor:
  • Selecciona: "Usar el mismo valor para cada conversión"
  • Ingresa: 5.00 USD
Recuento: Cada conversión
Período de conversión: 30 días
Período de conversión para vista: 1 día
Incluir en "Conversiones": SÍ ✅
Modelo de atribución: Basado en datos
```

5. Clic en **"Crear y continuar"**
6. En la siguiente pantalla verás:
   - **ID de conversión:** `AW-XXXXXXXXXX` ← Anota esto
   - **Etiqueta de conversión:** `xxxxxxxxxxxxx` ← Anota esto
7. El formato completo será: `AW-XXXXXXXXXX/xxxxxxxxxxxxx` ← Esto es lo que necesitas

#### C. Crear Conversión #2: "Suscripción de Pago"

**Esta conversión rastrea cuando alguien COMPRA un plan - LA MÁS IMPORTANTE**

1. Regresa a **"Conversiones"** → **"+ Nueva acción de conversión"**
2. Selecciona: **"Sitio web"**
3. Clic en: **"Agregar manualmente una acción de conversión"**
4. Configura así:

```
Categoría: Compra
Nombre de conversión: Suscripción de Pago
Valor:
  • Selecciona: "Usar valores diferentes para cada conversión" ✅
  • Valor predeterminado: 19.00 USD
Recuento: Cada conversión
Período de conversión: 90 días (más largo para suscripciones)
Período de conversión para vista: 7 días
Incluir en "Conversiones": SÍ ✅
Modelo de atribución: Basado en datos
```

5. Clic en **"Crear y continuar"**
6. Anota:
   - **ID de conversión completo:** `AW-XXXXXXXXXX/yyyyyyyyyyyyy`

#### D. Encontrar tu ID Principal de Google Ads

Si no lo anotaste antes:

1. En Google Ads, clic en **"Herramientas y configuración"**
2. Clic en **"Configuración"** → **"Configuración de la cuenta"**
3. Verás tu **"ID de cliente"**: `123-456-7890`
4. Conviértelo a formato: `AW-1234567890` (quita los guiones y agrega "AW-")

---

## 📋 FORMATO DE LAS VARIABLES

Una vez que tengas los 3 IDs, tu `.env.local` debe verse así:

```bash
# Supabase (ya las tienes)
NEXT_PUBLIC_SUPABASE_URL=tu-url-actual
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key-actual

# PayPal (ya las tienes)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu-paypal-id
PAYPAL_SECRET=tu-paypal-secret

# Google Analytics 4 ✅
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-DH3DL689D2

# Google Ads (completa estos)
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP=AW-XXXXXXXXXX/xxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE=AW-XXXXXXXXXX/yyyyyyyyyyyyy
```

**Ejemplo real de cómo se vería:**
```bash
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-987654321
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP=AW-987654321/AbC123dEfGh
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE=AW-987654321/XyZ789aBcDe
```

---

## 🚀 CUANDO TENGAS LOS IDs DE GOOGLE ADS

Avísame y:

1. Actualizo tu `.env.local`
2. Agregamos las variables a Vercel
3. Desplegamos los cambios
4. Verificamos que todo funcione

---

## ✅ PROGRESO ACTUAL

```
[✅] Google Analytics 4 ID obtenido: G-DH3DL689D2
[⏳] Agregar GA4 a Vercel (hazlo ahora)
[⏳] Configurar conversiones en Google Ads (siguiente)
[⏳] Agregar todas las variables a Vercel
[⏳] Desplegar cambios
[⏳] Verificar con Tag Assistant
```

---

**Tiempo estimado restante:** 30-45 minutos

¿Ya tienes tu cuenta de Google Ads abierta? Empieza a configurar las conversiones mientras yo preparo todo para el deploy final. 🚀

