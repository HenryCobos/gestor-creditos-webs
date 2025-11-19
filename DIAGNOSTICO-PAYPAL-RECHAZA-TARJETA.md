# 🚨 PayPal Rechaza la Tarjeta - Diagnóstico y Soluciones

## El Problema

Al intentar agregar una tarjeta de crédito/débito en el checkout de PayPal:
1. Ingresas los datos correctamente
2. Haces clic en "Agregar"
3. Parece cargar
4. **Te regresa a la misma pantalla pidiendo agregar tarjeta nuevamente**

---

## 🔍 DIAGNÓSTICO

### Paso 1: Ver el Error Específico

**Abre la consola del navegador:**
1. Presiona **F12** en tu teclado
2. Haz clic en la pestaña **"Console"**
3. Intenta agregar la tarjeta de nuevo
4. Observa si aparecen mensajes de error en rojo

**Errores comunes:**
- `INSTRUMENT_DECLINED` → Tu tarjeta fue rechazada por PayPal
- `INVALID_REQUEST` → Datos incorrectos o plan no configurado
- `SUBSCRIPTION_NOT_ACTIVE` → El plan no está activo en PayPal
- `BILLING_AGREEMENT_CANCELLED` → Problema con el acuerdo de suscripción

---

## ✅ SOLUCIONES (En Orden de Probabilidad)

### Solución 1: Vincular la Tarjeta PRIMERO a tu Cuenta de PayPal ⭐ MEJOR OPCIÓN

**Por qué funciona:** PayPal tiene restricciones más estrictas al agregar tarjetas durante el checkout. Si la vinculas primero a tu cuenta, el proceso es más confiable.

**Pasos:**

1. **Abre PayPal:**
   - Ve a: https://www.paypal.com
   - Inicia sesión con tu cuenta

2. **Agrega tu tarjeta:**
   - Haz clic en **"Billetera"** o **"Wallet"**
   - Busca **"Vincular tarjeta"** o **"Link a card"**
   - Ingresa los datos de tu tarjeta:
     * Número de tarjeta (16 dígitos)
     * Fecha de vencimiento
     * Código de seguridad (CVV)
     * Dirección de facturación
   - Haz clic en **"Vincular tarjeta"**

3. **Verifica la tarjeta:**
   - PayPal puede hacer un cargo pequeño (< $1) para verificar
   - O enviarte un código por SMS/email
   - Completa la verificación

4. **Intenta la suscripción de nuevo:**
   - Regresa a tu aplicación
   - Intenta suscribirte otra vez
   - PayPal ahora usará tu tarjeta ya vinculada
   - ✅ Debería funcionar

---

### Solución 2: Usar una Tarjeta de Crédito (No Débito)

**Problema:** Algunas tarjetas de débito no permiten suscripciones recurrentes.

**Qué hacer:**
- ✅ Usa una **tarjeta de crédito** Visa o Mastercard
- ❌ Evita tarjetas de débito prepagadas
- ❌ Evita tarjetas virtuales temporales

**Tarjetas que funcionan mejor con PayPal:**
- ✅ Visa Crédito
- ✅ Mastercard Crédito
- ✅ American Express
- ⚠️ Visa Débito (puede tener restricciones)
- ⚠️ Tarjetas prepagadas (generalmente no funcionan)

---

### Solución 3: Verificar que tu Cuenta de PayPal Esté Verificada

**Pasos:**

1. Ve a https://www.paypal.com
2. Inicia sesión
3. Ve a **"Configuración"** → **"Información del perfil"**
4. Busca el **estado de verificación**

**Si NO está verificada:**
- Completa el proceso de verificación
- Puede requerir:
  * Confirmar tu email
  * Vincular una cuenta bancaria
  * Proporcionar información adicional

---

### Solución 4: Fondos o Límites

Aunque es un período de prueba de 7 días, PayPal valida:

1. **Fondos disponibles:** Debe haber al menos el monto de una cuota
2. **Límite de crédito:** Si es tarjeta de crédito, debe tener límite disponible
3. **Autorización:** Tu banco debe permitir cargos internacionales/en línea

**Qué hacer:**
- Verifica que tengas fondos/límite disponible
- Llama a tu banco y pregunta si bloquearon transacciones de PayPal
- Habilita compras internacionales si es necesario

---

### Solución 5: Restricciones Geográficas

**Problema:** La dirección de facturación no coincide con el país de la tarjeta.

**Qué verificar:**
- ✅ La dirección debe ser del mismo país que tu tarjeta
- ✅ El código postal debe ser válido
- ✅ El nombre debe coincidir exactamente con el de la tarjeta

---

### Solución 6: Usar el Saldo de PayPal

Si tienes saldo en tu cuenta de PayPal:

1. Ve a https://www.paypal.com
2. Transfiere fondos a tu cuenta
3. Intenta la suscripción usando el saldo de PayPal

---

### Solución 7: Verificar Plan Activo en PayPal (Lado del Desarrollador)

**Solo si eres el dueño del sitio:**

1. Ve a https://www.paypal.com
2. Inicia sesión con tu **cuenta de negocio**
3. Ve a **"Productos y Servicios"** → **"Suscripciones"**
4. Verifica que el plan que intentas comprar:
   - ✅ Estado: **ACTIVO**
   - ✅ Modo: **Live** (no Sandbox)
   - ✅ Precio correcto

---

## 🧪 PRUEBA ALTERNATIVA: Usar Cuenta PayPal en vez de Tarjeta

En lugar de agregar una tarjeta, puedes pagar directamente con tu saldo de PayPal:

1. En el checkout de PayPal, busca el botón **"Pagar con PayPal"**
2. Inicia sesión en tu cuenta
3. Usa el saldo o una tarjeta ya vinculada
4. Debería funcionar sin problemas

---

## 📞 CONTACTAR A PAYPAL

Si ninguna solución funciona, contacta al soporte de PayPal:

1. **Chat en vivo:** https://www.paypal.com/us/smarthelp/contact-us
2. **Teléfono:** Busca el número de tu país
3. **Mensaje:** "Mi tarjeta es rechazada al intentar suscribirme a un servicio recurrente"

Proporciona:
- Últimos 4 dígitos de tu tarjeta
- Fecha y hora del intento
- Mensaje de error (si lo hay)

---

## 🔧 PARA EL DESARROLLADOR

Si eres el dueño del sitio y necesitas verificar la configuración:

### Verificar Credenciales de PayPal

**¿Estás usando credenciales LIVE o SANDBOX?**

1. Ve a Vercel → tu proyecto → Settings → Environment Variables
2. Verifica: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
3. **Debe empezar con:**
   - ✅ `AV...` o `AX...` (Live/Producción)
   - ❌ `ASH...` o `Ab...` (Sandbox/Pruebas)

### Verificar Plan IDs en Supabase

Ejecuta en Supabase SQL Editor:

```sql
SELECT 
  nombre,
  slug,
  caracteristicas->'paypal_plan_id_monthly' as plan_mensual,
  caracteristicas->'paypal_plan_id_yearly' as plan_anual
FROM planes
WHERE slug = 'pro';  -- Cambia 'pro' por el plan que estás probando
```

**Resultado esperado:**
- Debe mostrar Plan IDs que empiezan con `P-...`
- Ambos (mensual y anual) deben estar configurados

### Verificar en PayPal Dashboard

1. Ve a https://www.paypal.com
2. Inicia sesión (cuenta de negocio)
3. Productos y Servicios → Suscripciones
4. Verifica que tu plan esté:
   - ✅ Estado: ACTIVO
   - ✅ Precio correcto
   - ✅ Período correcto (mensual/anual)

---

## 📊 RESUMEN DE CAUSAS COMUNES

| Causa | Probabilidad | Solución |
|-------|-------------|----------|
| Tarjeta no vinculada a PayPal | ⭐⭐⭐⭐⭐ | Vincúlala primero |
| Tarjeta de débito con restricciones | ⭐⭐⭐⭐ | Usa tarjeta de crédito |
| Cuenta PayPal no verificada | ⭐⭐⭐ | Verifica tu cuenta |
| Fondos insuficientes | ⭐⭐ | Verifica saldo/límite |
| Restricción del banco | ⭐⭐ | Llama a tu banco |
| Credenciales Sandbox en producción | ⭐ | Cambia a Live |
| Plan inactivo en PayPal | ⭐ | Activa el plan |

---

## ✅ CHECKLIST DE SOLUCIONES

Marca las que ya probaste:

- [ ] Ver error en consola del navegador (F12)
- [ ] Vincular tarjeta primero a cuenta de PayPal
- [ ] Usar tarjeta de crédito en vez de débito
- [ ] Verificar cuenta de PayPal
- [ ] Verificar fondos/límite disponible
- [ ] Llamar al banco para habilitar compras en línea
- [ ] Pagar con saldo de PayPal
- [ ] Contactar soporte de PayPal

---

## 🆘 PRÓXIMOS PASOS

1. **Primero:** Intenta vincular tu tarjeta a PayPal (Solución 1) ⭐
2. **Si no funciona:** Verifica el error en la consola (F12)
3. **Envíame:** El mensaje de error específico que aparece
4. **Alternativa:** Contacta a PayPal Support

---

**Última actualización:** Noviembre 2024

