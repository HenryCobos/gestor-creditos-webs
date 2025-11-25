# 📧 Solución: Emails para Usuarios Corregidos

## 🎯 Situación Actual

Acabas de corregir los registros de usuarios que tenían problemas (sin perfil o sin plan). Ahora te preguntas si recibirán los emails de confirmación y seguimiento.

---

## ⚠️ Respuesta Importante

### **1. Email de Confirmación de Supabase Auth**

**❌ NO se enviará automáticamente** a usuarios ya registrados.

**¿Por qué?**
- El email de confirmación solo se envía cuando alguien se registra por primera vez (cuando se llama a `supabase.auth.signUp()`)
- Estos usuarios ya se registraron hace días/semanas
- Supabase no reenvía emails de confirmación automáticamente

**✅ Solución:**
Si necesitas que reciban el email de confirmación, tienes 2 opciones:

#### **Opción A: Reenviar Manualmente (Recomendado)**
1. Ve a Supabase → **Authentication** → **Users**
2. Busca cada usuario corregido
3. Haz clic en los 3 puntos (⋯) → **Resend confirmation email**

#### **Opción B: Script SQL para Reenviar**
```sql
-- Esto requiere usar la API de Supabase Admin
-- Mejor usa la Opción A (más fácil)
```

---

### **2. Emails de Seguimiento (Drip Campaign)**

**✅ SÍ, pueden recibirlos, PERO necesitas agregarlos primero.**

**¿Por qué?**
- El drip campaign solo funciona para usuarios que están en la tabla `email_campaigns`
- El trigger que agrega usuarios automáticamente solo funciona para **nuevos registros**
- Los usuarios corregidos ya existían, así que no se agregaron automáticamente

**✅ Solución: Ejecutar Script SQL**

---

## 🚀 Pasos para Activar Emails de Seguimiento

### **Paso 1: Agregar Usuarios Corregidos al Drip Campaign**

1. Abre Supabase SQL Editor
2. Copia y pega el contenido de: `AGREGAR-USUARIOS-CORREGIDOS-A-EMAIL-CAMPAIGN.sql`
3. Ejecuta (RUN o Ctrl+Enter)

**¿Qué hace este script?**
- ✅ Agrega todos los usuarios corregidos a la tabla `email_campaigns`
- ✅ Los marca como que ya recibieron el email de bienvenida (day_0)
- ✅ Los prepara para recibir los emails de seguimiento (día 1-7)

---

### **Paso 2: Verificar que se Agregaron Correctamente**

Ejecuta esta query para ver los usuarios en el drip campaign:

```sql
SELECT 
  ec.email,
  ec.full_name,
  ec.created_at as fecha_registro,
  ec.day_0_sent_at as email_bienvenida_enviado,
  CASE 
    WHEN ec.day_0_sent_at IS NULL THEN '❌ No recibió email de bienvenida'
    ELSE '✅ Email de bienvenida enviado'
  END as estado_bienvenida
FROM email_campaigns ec
ORDER BY ec.created_at DESC;
```

---

### **Paso 3: Verificar que el Cron Job Está Configurado**

El drip campaign se envía automáticamente mediante un cron job. Verifica:

1. **¿Tienes configurado el cron job?**
   - Ve a Vercel → **Settings** → **Cron Jobs**
   - Debe haber un job que ejecute: `/api/cron/send-drip-emails`
   - Frecuencia: Diaria (una vez al día)

2. **¿Está configurado Resend?**
   - Ve a: https://resend.com
   - Verifica que tienes una API key configurada
   - Variable de entorno: `RESEND_API_KEY`

**Si NO está configurado:**
- Consulta: `CONFIGURAR-EMAIL-DRIP-AHORA.md`
- Sigue las instrucciones paso a paso

---

## 📅 Cuándo Recibirán los Emails

### **Emails de Seguimiento (Drip Campaign)**

Los usuarios corregidos recibirán los emails según su fecha de registro original:

- **Día 1:** 1 día después de su fecha de registro
- **Día 2:** 2 días después de su fecha de registro
- **Día 3:** 3 días después de su fecha de registro
- ... y así sucesivamente

**Ejemplo:**
- Usuario se registró el 22/11/2025
- Si hoy es 23/11/2025, recibirá el email del Día 1 mañana (24/11)
- Si hoy es 25/11/2025, recibirá el email del Día 3 mañana (26/11)

**⚠️ Nota:** El cron job se ejecuta una vez al día, así que los emails se enviarán cuando corresponda según la fecha.

---

## ✅ Checklist

- [ ] Ejecuté el script para agregar usuarios corregidos a `email_campaigns`
- [ ] Verifiqué que los usuarios aparecen en la tabla `email_campaigns`
- [ ] Verifiqué que el cron job está configurado en Vercel
- [ ] Verifiqué que Resend está configurado con API key
- [ ] (Opcional) Reenvié emails de confirmación manualmente si es necesario

---

## 🆘 Si No Reciben Emails

### **Problema 1: No aparecen en email_campaigns**

**Solución:**
1. Ejecuta el script `AGREGAR-USUARIOS-CORREGIDOS-A-EMAIL-CAMPAIGN.sql` de nuevo
2. Verifica que no hay errores en la ejecución

### **Problema 2: El cron job no está funcionando**

**Solución:**
1. Ve a Vercel → **Deployments** → Último deployment
2. Ve a **Functions** → Busca `/api/cron/send-drip-emails`
3. Revisa los logs para ver si hay errores
4. Verifica que la ruta esté configurada correctamente

### **Problema 3: Resend no está enviando**

**Solución:**
1. Ve a https://resend.com/emails
2. Revisa si hay emails en la cola
3. Verifica que la API key esté correcta
4. Revisa los logs de errores en Resend

---

## 📊 Monitorear Emails Enviados

Para ver qué emails se han enviado:

```sql
SELECT 
  ec.email,
  ec.full_name,
  ec.day_0_sent_at as bienvenida,
  ec.day_1_sent_at as dia_1,
  ec.day_2_sent_at as dia_2,
  ec.day_3_sent_at as dia_3,
  ec.day_4_sent_at as dia_4,
  ec.day_5_sent_at as dia_5,
  ec.day_6_sent_at as dia_6,
  ec.day_7_sent_at as dia_7
FROM email_campaigns ec
WHERE ec.email IN (
  -- Lista de emails de usuarios corregidos
  'email1@example.com',
  'email2@example.com'
)
ORDER BY ec.created_at DESC;
```

---

## 🎯 Resumen

1. **Email de confirmación:** NO se envía automáticamente. Reenvía manualmente si es necesario.
2. **Emails de seguimiento:** SÍ se enviarán, pero primero ejecuta el script para agregarlos a `email_campaigns`.
3. **Cron job:** Debe estar configurado en Vercel para que se envíen automáticamente.
4. **Resend:** Debe estar configurado con API key.

¿Necesitas ayuda configurando el cron job o Resend?

