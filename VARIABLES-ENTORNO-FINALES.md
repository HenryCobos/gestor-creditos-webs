# 🔧 Variables de Entorno - Configuración Final

## ✅ VARIABLES PARA VERCEL

Agrega estas 4 variables en Vercel:

### 1. Google Analytics 4
```
Name: NEXT_PUBLIC_GA_MEASUREMENT_ID
Value: G-DH3DL689D2
```

### 2. Google Ads - ID Principal
```
Name: NEXT_PUBLIC_GOOGLE_ADS_ID
Value: AW-740437500
```

### 3. Conversión: Registro Completado
```
Name: NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP
Value: AW-740437500/4PG5CMzmp8MbEPzbiOEC
```

### 4. Conversión: Suscripción de Pago
```
Name: NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE
Value: AW-740437500/MZIVCLuOoMMbEPzbiOEC
```

---

## 📋 PARA TU ARCHIVO .env.local

Si quieres probar en local, agrega esto a tu `.env.local`:

```bash
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-DH3DL689D2

# Google Ads
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-740437500
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP=AW-740437500/4PG5CMzmp8MbEPzbiOEC
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE=AW-740437500/MZIVCLuOoMMbEPzbiOEC
```

---

## 🚀 PASOS SIGUIENTES

### 1. Agregar Variables a Vercel (10 min)
- [x] Ir a Vercel Dashboard
- [ ] Settings → Environment Variables
- [ ] Agregar las 4 variables
- [ ] Save cada una

### 2. Redesplegar (5 min)
- [ ] Vercel redesplegará automáticamente
- [ ] O forzar redeploy desde Deployments

### 3. Verificar (15 min)
- [ ] Esperar 2-3 minutos
- [ ] Abrir sitio en producción
- [ ] Usar Google Tag Assistant
- [ ] Verificar que píxeles funcionen

### 4. Probar Conversión (10 min)
- [ ] Crear cuenta de prueba
- [ ] Verificar en Google Ads que se registre
- [ ] Esperar 10-30 minutos para ver datos

---

## ✅ LO QUE SE RASTREARÁ

Una vez desplegado, se rastrearán automáticamente:

| Evento | Valor | Cuándo se dispara |
|--------|-------|-------------------|
| **Registro Completado** | $5 | Usuario completa registro gratuito |
| **Suscripción de Pago** | $19-179 | Usuario compra plan (Profesional, Business, Enterprise) |
| CTA Clicks | - | Usuario hace clic en botones |
| View Pricing | - | Usuario scrollea a precios |
| Begin Checkout | - | Usuario inicia proceso de pago |

---

## 🎯 MÉTRICAS EN GOOGLE ADS

Podrás ver en tus campañas:

- **Conversiones de Registro:** Cuántos se registraron gratis
- **Costo por Registro:** Cuánto gastas por cada registro
- **Conversiones de Suscripción:** Cuántos PAGARON
- **Costo por Suscripción:** Tu costo real de adquisición
- **ROI:** Ingreso vs Gasto en publicidad

---

## 📞 VERIFICACIÓN

Para verificar que todo funcione:

1. Instala extensión Chrome: **"Tag Assistant Legacy"**
2. Abre tu sitio: https://gestor-creditos-webs.vercel.app
3. Activa Tag Assistant
4. Deberías ver:
   - ✅ Google Analytics 4 (G-DH3DL689D2)
   - ✅ Google Ads Conversion Tracking (AW-740437500)

---

**Fecha:** Noviembre 19, 2025  
**Proyecto:** GestorPro  
**Estado:** Listo para desplegar 🚀

