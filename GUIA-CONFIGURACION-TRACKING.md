# 📊 Guía de Configuración: Google Analytics & Google Ads

## 🎯 RESUMEN

Esta guía te ayudará a configurar el tracking completo para medir el ROI de tus campañas de Google Ads.

**Tiempo estimado:** 2-3 horas

---

## ✅ PASO 1: Google Analytics 4 (30 minutos)

### 1.1 Crear Propiedad GA4

1. Ve a: https://analytics.google.com
2. Clic en **"Crear" → "Propiedad"**
3. Configura:
   - **Nombre de la propiedad:** GestorPro
   - **Zona horaria:** Tu zona horaria
   - **Moneda:** USD
4. Clic en **"Siguiente"**
5. Selecciona categoría: **Software/Tecnología**
6. Clic en **"Crear"**

### 1.2 Configurar Flujo de Datos Web

1. Selecciona **"Web"**
2. Configura:
   - **URL del sitio web:** https://gestor-creditos-webs.vercel.app
   - **Nombre del flujo:** GestorPro Web
3. Clic en **"Crear flujo"**

### 1.3 Obtener ID de Medición

1. Verás tu **ID de medición**: `G-XXXXXXXXXX`
2. **COPIA este ID** - lo necesitarás en el siguiente paso

### 1.4 Agregar a Variables de Entorno

Abre tu archivo `.env.local` y agrega:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

> ⚠️ **Reemplaza** `G-XXXXXXXXXX` con tu ID real de GA4

---

## ✅ PASO 2: Google Ads - Cuenta y Píxel (40 minutos)

### 2.1 Configurar Conversiones en Google Ads

1. Ve a tu cuenta de Google Ads: https://ads.google.com
2. Clic en **"Herramientas y configuración"** (ícono de llave)
3. En **"Medición"**, clic en **"Conversiones"**
4. Clic en **"+ Nueva acción de conversión"**

### 2.2 Crear Conversión #1: Registro (PRIMARIA)

Esta es tu conversión principal - cuando alguien se registra gratuitamente.

1. Selecciona **"Sitio web"**
2. Clic en **"Agregar manualmente una acción de conversión"**
3. Configura:
   - **Categoría:** Registro
   - **Nombre de conversión:** Registro Completado
   - **Valor:** 
     - Selecciona "Usar el mismo valor para cada conversión"
     - Ingresa: `5.00` USD (valor estimado de un registro)
   - **Recuento:** Cada conversión
   - **Período de conversión:** 30 días
   - **Período de conversión para vista:** 1 día
   - **Incluir en "Conversiones":** SÍ ✅
   - **Modelo de atribución:** Basado en datos
4. Clic en **"Crear y continuar"**

### 2.3 Obtener IDs de Conversión #1

Después de crear la conversión:

1. Verás el **ID de conversión**: `AW-XXXXXXXXXX`
2. Y la **Etiqueta de conversión**: `xxxxxxxxxxxxx`
3. El formato completo será: `AW-XXXXXXXXXX/xxxxxxxxxxxxx`

**COPIA estos valores:**
- ID de Google Ads: `AW-XXXXXXXXXX`
- ID de Conversión Completo: `AW-XXXXXXXXXX/xxxxxxxxxxxxx`

### 2.4 Crear Conversión #2: Suscripción de Pago (SECUNDARIA - MÁS VALIOSA)

Esta conversión rastrea cuando alguien **compra una suscripción** - es la más importante para tu ROI.

1. Regresa a **"Conversiones"** → **"+ Nueva acción de conversión"**
2. Selecciona **"Sitio web"** → **"Agregar manualmente"**
3. Configura:
   - **Categoría:** Compra
   - **Nombre de conversión:** Suscripción de Pago
   - **Valor:** 
     - Selecciona "Usar valores diferentes para cada conversión" ✅
     - Valor predeterminado: `19.00` USD
   - **Recuento:** Cada conversión
   - **Período de conversión:** 90 días (más largo porque el ciclo de decisión es mayor)
   - **Período de conversión para vista:** 7 días
   - **Incluir en "Conversiones":** SÍ ✅
   - **Modelo de atribución:** Basado en datos
4. Clic en **"Crear y continuar"**

### 2.5 Obtener IDs de Conversión #2

1. **COPIA** el ID de conversión completo: `AW-XXXXXXXXXX/yyyyyyyyyyyyy`

### 2.6 Agregar a Variables de Entorno

Abre tu archivo `.env.local` y agrega:

```bash
# Google Ads
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX

# Conversión: Registro
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP=AW-XXXXXXXXXX/xxxxxxxxxxxxx

# Conversión: Suscripción de Pago
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE=AW-XXXXXXXXXX/yyyyyyyyyyyyy
```

> ⚠️ **Reemplaza** los valores con tus IDs reales

**Ejemplo real de cómo se ve:**
```bash
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-123456789
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP=AW-123456789/AbC123dEfGh
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE=AW-123456789/XyZ789aBcDe
```

---

## ✅ PASO 3: Desplegar Cambios (10 minutos)

### 3.1 Agregar Variables a Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto: **gestor-creditos-webs**
3. Ve a **"Settings" → "Environment Variables"**
4. Agrega las 4 nuevas variables:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID = G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_ID = AW-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP = AW-XXXXXXXXXX/xxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE = AW-XXXXXXXXXX/yyyyyyyyyyyyy
```

5. Clic en **"Save"** en cada una

### 3.2 Desplegar a Producción

En tu terminal:

```bash
git add .
git commit -m "Agregar tracking: Google Analytics 4 y Google Ads conversiones"
git push origin main
```

Espera 2-3 minutos mientras Vercel despliega.

---

## ✅ PASO 4: Verificar que Funciona (15 minutos)

### 4.1 Verificar Google Analytics

1. Ve a: https://analytics.google.com
2. Selecciona tu propiedad **GestorPro**
3. Ve a **"Informes" → "Tiempo real"**
4. Abre tu sitio en otra pestaña: https://gestor-creditos-webs.vercel.app
5. Deberías ver **1 usuario activo** en el reporte de tiempo real ✅

### 4.2 Verificar Google Ads Píxel

1. Instala la extensión de Chrome: **"Google Tag Assistant"**
   - https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk
2. Abre tu sitio: https://gestor-creditos-webs.vercel.app
3. Clic en la extensión **Tag Assistant**
4. Deberías ver:
   - ✅ **Google Ads Conversion Tracking** (tag detectado)
   - ✅ **Google Analytics 4** (tag detectado)

### 4.3 Probar Conversión de Registro (Opcional)

Si quieres estar 100% seguro:

1. Crea una cuenta de prueba en tu sitio
2. Ve a Google Ads → **"Conversiones"**
3. Busca **"Registro Completado"**
4. En 10-30 minutos deberías ver **+1 conversión**

---

## 📊 EVENTOS QUE SE RASTREAN AUTOMÁTICAMENTE

Una vez desplegado, se rastrearán estos eventos:

### 🎯 Conversiones Principales

| Evento | Cuándo se dispara | Valor | Importancia |
|--------|-------------------|-------|-------------|
| **Registro Completado** | Usuario completa registro gratuito | $5 | ALTA - Conversión primaria |
| **Suscripción de Pago** | Usuario compra plan ($19-179) | Valor real | CRÍTICA - Conversión más valiosa |

### 📈 Micro-Conversiones (Observación)

| Evento | Cuándo se dispara | Para qué sirve |
|--------|-------------------|----------------|
| `view_pricing` | Usuario scrollea a sección de precios | Medir interés en planes |
| `cta_click` | Usuario hace clic en cualquier CTA | Identificar CTAs más efectivos |
| `begin_checkout` | Usuario inicia proceso de pago | Medir abandono en checkout |

---

## 🎯 CONFIGURAR CAMPAÑAS DE GOOGLE ADS

Una vez que el tracking esté funcionando, puedes crear tus campañas:

### Configuración de Conversiones en Campañas

Cuando crees tus campañas:

1. En **"Objetivos de campaña"**, selecciona:
   - ✅ **Registro Completado** (conversión principal)
   - ✅ **Suscripción de Pago** (conversión secundaria)

2. En **"Estrategia de puja"**, selecciona:
   - **Mes 1-2:** "Maximizar conversiones" (para recopilar datos)
   - **Mes 3+:** "Maximizar el valor de conversión" (para optimizar ROI)

### Valores de Conversión

| Conversión | Valor | Cómo se calcula |
|------------|-------|-----------------|
| Registro | $5 fijo | Valor estimado de lead |
| Suscripción Plan Profesional | $19 dinámico | Valor real del plan |
| Suscripción Plan Business | $49 dinámico | Valor real del plan |
| Suscripción Plan Enterprise | $179 dinámico | Valor real del plan |

---

## 📊 MÉTRICAS A MONITOREAR

### Diarias (5 minutos)

En Google Ads:
- **Impresiones:** ¿Se muestran tus anuncios?
- **CTR:** Meta > 3%
- **CPC:** Meta $2-3
- **Conversiones:** ¿Cuántos registros hoy?

### Semanales (30 minutos)

- **Costo por registro:** Meta < $20
- **Tasa de conversión (registro → pago):** Meta 10-20%
- **ROI por campaña**
- **Términos de búsqueda** (agregar negativos)

### Mensuales (2 horas)

- **ROI global**
- **LTV (Lifetime Value) de suscriptores**
- **Tasa de retención**
- **Ajustar presupuesto entre campañas**

---

## ⚠️ PROBLEMAS COMUNES

### Problema 1: No veo datos en Google Analytics

**Solución:**
1. Verifica que las variables de entorno estén en Vercel
2. Revisa que el ID sea correcto: `G-XXXXXXXXXX`
3. Espera 5-10 minutos después del deploy
4. Limpia caché del navegador: `Ctrl + Shift + R`

### Problema 2: Conversiones no se registran

**Solución:**
1. Verifica los IDs de conversión en `.env.local`
2. Usa **Tag Assistant** para verificar que el píxel se dispara
3. Espera hasta 24 horas (Google Ads puede demorar)
4. Verifica que las conversiones estén habilitadas en Google Ads

### Problema 3: Tag Assistant no detecta píxeles

**Solución:**
1. Abre las **Developer Tools** (F12)
2. Ve a la pestaña **"Console"**
3. Busca errores relacionados con `gtag`
4. Verifica que las variables de entorno no tengan espacios extras

---

## 🚀 ¡LISTO PARA LANZAR!

Una vez completados todos los pasos:

✅ Google Analytics funcionando
✅ Píxel de Google Ads instalado
✅ Conversiones configuradas
✅ Variables de entorno en Vercel
✅ Deploy exitoso

**Puedes crear tus campañas de Google Ads siguiendo:**
- `ESTRATEGIA-GOOGLE-ADS-COMPLETA.md`
- `CONFIGURACION-GOOGLE-ADS-PASO-A-PASO.md`

---

## 📞 SOPORTE

Si tienes problemas con la configuración:

1. **Revisa las DevTools** (F12 → Console) para errores
2. **Usa Tag Assistant** para verificar píxeles
3. **Espera 24-48 horas** para que Google procese datos
4. **Contacta soporte de Google Ads** si las conversiones no se registran

---

**Creado:** Noviembre 2025  
**Proyecto:** GestorPro  
**Versión:** 1.0

