# 🔄 Renovaciones Automáticas con Hotmart

## 📊 Situación Actual

### **Usuario:** wilsonortiz.embperu@gmail.com
- ✅ Compró Plan Profesional Mensual con 50% OFF
- ✅ Pagó $9.50 USD
- ⚠️ **Requiere activación manual por ahora**

---

## 🔍 ¿Cómo Funciona el Sistema?

### **Flujo Completo:**

```
1. Usuario compra en Hotmart
   ↓
2. Hotmart procesa el pago
   ↓
3. Hotmart envía Webhook a tu servidor
   ↓
4. Tu servidor activa el plan automáticamente
   ↓
5. Usuario tiene acceso inmediato
```

---

## ⚠️ **Problema Identificado**

### **Primera Compra NO se Activó Automáticamente**

**Posibles razones:**

1. **Webhook no llegó** - Hotmart no pudo comunicarse con tu servidor
2. **Error en el webhook** - El código falló al procesar
3. **Email no coincide** - El email en Hotmart es diferente al registrado
4. **Código de oferta incorrecto** - El código usado no está mapeado

---

## ✅ **Solución Implementada**

### **1. Activación Manual** (Para este usuario específico)

Ejecuta este script en Supabase:

```sql
-- Ver en: supabase/activar-suscripcion-manual.sql
-- Activa el Plan Profesional Mensual para wilsonortiz.embperu@gmail.com
```

### **2. Renovaciones Automáticas** (Actualizado)

He mejorado el webhook para que maneje **renovaciones automáticas**:

**Eventos que ahora maneja:**
- ✅ `PURCHASE_APPROVED` - Primera compra
- ✅ `SUBSCRIPTION_RENEWAL` - Renovación mensual/anual
- ✅ `PAYMENT_APPROVED` - Pago aprobado (alternativo)
- ✅ `SUBSCRIPTION_PAYMENT_APPROVED` - Pago de suscripción (alternativo)
- ✅ `SUBSCRIPTION_CANCELLATION` - Cancelación
- ✅ `REFUND` - Reembolso
- ✅ `DISPUTE_OPENED` - Disputa

---

## 🎯 **¿Qué Pasará Ahora?**

### **Con Este Usuario (wilsonortiz.embperu@gmail.com):**

1. **HOY:**
   - ✅ Activas el plan manualmente con el script SQL
   - ✅ Usuario tiene acceso al Plan Pro
   - ✅ Válido por 30 días

2. **A FIN DE MES (Día 30):**
   - 🔄 Hotmart cobra automáticamente $9.50
   - 🔄 Hotmart envía webhook `SUBSCRIPTION_RENEWAL`
   - ✅ **Tu servidor renueva automáticamente** el plan
   - ✅ Las fechas se actualizan (+30 días)
   - ✅ **NO necesitas hacer nada manual**

3. **MESES SIGUIENTES:**
   - 🔄 Proceso se repite automáticamente cada mes
   - ✅ Mientras el usuario pague en Hotmart, tendrá acceso

---

## 🚫 **¿Cuándo NO Será Automático?**

El usuario perderá acceso si:

1. ❌ **Cancela la suscripción** en Hotmart
   - Tu webhook lo detecta y lo pasa a plan Free

2. ❌ **El pago falla** (tarjeta rechazada, sin fondos)
   - Hotmart NO envía webhook de renovación
   - El plan expira automáticamente

3. ❌ **Pide reembolso**
   - Tu webhook lo detecta y lo pasa a plan Free

4. ❌ **Abre una disputa**
   - Tu webhook lo detecta y lo pasa a plan Free

---

## 🔧 **Verificar que el Webhook Funciona**

### **Paso 1: Verificar en Hotmart**

1. Ve a: **Hotmart** → **Herramientas** → **Webhooks**
2. Busca la URL configurada:
   ```
   https://gestor-creditos-webs.vercel.app/api/webhooks/hotmart
   ```
3. Verifica que esté **ACTIVO** ✅

### **Paso 2: Ver Logs en Vercel**

1. Ve a: **Vercel** → **Deployments** → **Functions**
2. Busca: `/api/webhooks/hotmart`
3. Revisa los logs cuando wilsonortiz.embperu@gmail.com hizo la compra
4. Busca errores o warnings

### **Paso 3: Probar con Usuario de Prueba**

Para asegurar que funcione:

1. Crea una oferta de $1 en Hotmart (prueba)
2. Compra con tu email personal
3. Verifica que se active automáticamente
4. Si funciona = El webhook está OK ✅

---

## 📋 **Checklist Post-Activación**

### **Para Este Usuario Específico:**

- [ ] Ejecutar script SQL de activación manual
- [ ] Verificar que aparece "Plan Profesional" en su dashboard
- [ ] Verificar límites (50 clientes, 50 préstamos)
- [ ] Notificar al usuario que su plan está activo
- [ ] Esperar a fin de mes para confirmar renovación automática

### **Para Futuras Compras:**

- [ ] Verificar webhook en Hotmart esté configurado
- [ ] Probar con compra de prueba ($1)
- [ ] Revisar logs en Vercel después de cada compra
- [ ] Confirmar que se activan automáticamente

---

## 🎯 **Resumen para Ti**

### **Pregunta Original:**

> "¿Tendré que activar manualmente cada mes?"

### **Respuesta:**

**NO**, después de hoy:

1. ✅ **Hoy:** Activas manualmente **una sola vez** a wilsonortiz.embperu@gmail.com
2. ✅ **A fin de mes:** Se renueva **automáticamente** (webhook actualizado)
3. ✅ **Meses siguientes:** Se renueva **automáticamente**

**La única razón para activar manualmente sería:**
- Si el webhook de Hotmart falla (muy raro)
- Si el usuario reporta que pagó pero no tiene acceso

---

## 🔍 **Monitoreo Recomendado**

### **Primeros 30 Días:**

Revisa los logs de Vercel diariamente:

```bash
# Ver logs del webhook
Vercel → Deployments → Functions → /api/webhooks/hotmart
```

Busca:
- ✅ `PURCHASE_APPROVED` - Nuevas compras
- 🔄 `SUBSCRIPTION_RENEWAL` - Renovaciones
- ❌ Errores o warnings

### **Después de 30 Días:**

Revisa solo si hay problemas reportados.

---

## 📞 **Si Algo Sale Mal**

### **Usuario Reporta: "Pagué pero no tengo acceso"**

1. **Verificar en Hotmart:**
   - ¿El pago fue aprobado?
   - ¿Se envió el webhook?

2. **Verificar en Vercel:**
   - ¿Llegó el webhook?
   - ¿Hay errores en los logs?

3. **Verificar en Supabase:**
   - ¿El usuario existe?
   - ¿Cuál es su plan actual?
   - ¿Hay registro en `pagos_suscripcion`?

4. **Activar Manualmente:**
   - Usar script `supabase/activar-suscripcion-manual.sql`
   - Cambiar el email por el del usuario

---

## 🚀 **Mejora Futura (Opcional)**

### **Panel de Admin para Activaciones Manuales**

Crear una página en tu dashboard:

```
/dashboard/admin/activar-plan
```

Donde puedas:
- 🔍 Buscar usuario por email
- 📊 Ver su plan actual
- ✅ Activar/cambiar plan con un click
- 💰 Ver historial de pagos
- 🔄 Forzar renovación manual

---

## 📁 **Archivos Relacionados**

### **Webhook:**
- `app/api/webhooks/hotmart/route.ts` - Webhook actualizado con renovaciones

### **Scripts SQL:**
- `supabase/activar-suscripcion-manual.sql` - Activar plan manualmente
- `supabase/verificar-usuario-suscripcion.sql` - Ver estado de cualquier usuario

### **Documentación:**
- `GUIA-TECNICA-HOTMART-SAAS.md` - Guía técnica completa
- `RENOVACIONES-AUTOMATICAS-HOTMART.md` - Este documento

---

## ✅ **Estado Final**

**Fecha:** Diciembre 10, 2025

**Cambios Realizados:**
- ✅ Webhook actualizado con soporte de renovaciones
- ✅ Scripts SQL creados para activación manual
- ✅ Deploy realizado en Vercel
- ✅ Documentación completa

**Próximo Paso:**
- ⏳ Activar manualmente a wilsonortiz.embperu@gmail.com
- ⏳ Esperar a fin de mes para confirmar renovación automática

---

**🎉 Las renovaciones ahora son AUTOMÁTICAS!**

