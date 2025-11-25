# 📧 Explicación: Tabla "campañas de correo electrónico" (email_campaigns)

## 🎯 ¿Qué es esta tabla?

La tabla `email_campaigns` (campañas de correo electrónico) es donde se guarda la información de los usuarios que recibirán los **emails de seguimiento automáticos** (drip campaign).

---

## 📊 Columnas que Ves en la Tabla

### **1. identificación (id)**
- **Tipo:** UUID (identificador único)
- **Qué es:** Un código único para cada registro en la tabla
- **Ejemplo:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### **2. ID de usuario (user_id)**
- **Tipo:** UUID
- **Qué es:** El ID del usuario en la tabla `auth.users`
- **Relación:** Conecta este registro con el usuario específico
- **Ejemplo:** `u1v2w3x4-y5z6-7890-abcd-ef1234567890`

### **3. correo electrónico (email)**
- **Tipo:** VARCHAR (texto)
- **Qué es:** El email del usuario donde se enviarán los correos
- **Ejemplo:** `denisjaviermontesvazquez@gmail.com`

### **4. nombre (full_name)**
- **Tipo:** VARCHAR (texto)
- **Qué es:** El nombre completo del usuario (para personalizar los emails)
- **Ejemplo:** `Denis J`, `Luis Alt`, `Claudia`

---

## 🔍 Columnas que NO Ves (Pero Existen)

La tabla tiene más columnas que no se muestran en la vista por defecto. Estas son importantes:

### **5. day_0_sent_at**
- **Qué es:** Fecha/hora cuando se envió el email de bienvenida
- **Estado:** Si tiene fecha = ✅ Email de bienvenida enviado
- **Estado:** Si es NULL = ❌ No se envió

### **6. day_1_sent_at hasta day_7_sent_at**
- **Qué es:** Fechas cuando se enviaron los emails de seguimiento (día 1 al día 7)
- **Ejemplo:**
  - `day_1_sent_at` = Email del día 1 enviado
  - `day_2_sent_at` = Email del día 2 enviado
  - etc.

### **7. unsubscribed**
- **Qué es:** Si el usuario se dio de baja de los emails
- **Valores:** `true` (sí se dio de baja) o `false` (sigue recibiendo)

### **8. created_at**
- **Qué es:** Fecha/hora cuando se agregó el usuario a la campaña
- **Importante:** Se usa para calcular qué día de email enviar

---

## ⚠️ Badge "RLS deshabilitado" (Row Level Security)

**¿Qué significa?**
- **RLS = Row Level Security** (Seguridad a Nivel de Fila)
- **Deshabilitado** = Cualquier usuario autenticado puede ver todos los registros

**¿Es un problema?**
- ⚠️ **Sí, puede ser un problema de seguridad**
- Cualquier usuario de tu app podría ver los emails de otros usuarios
- **Recomendación:** Habilitar RLS para proteger la privacidad

**¿Cómo habilitarlo?**
```sql
-- Habilitar RLS en la tabla
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Crear política: Solo el dueño puede ver su propio registro
CREATE POLICY "Users can view own email campaign" 
ON email_campaigns
FOR SELECT 
USING (auth.uid() = user_id);
```

---

## ✅ ¿Qué Significa Ver 5 Registros?

Si ves **5 registros** en la tabla, significa:

1. ✅ **5 usuarios están en el drip campaign**
   - Estos usuarios recibirán los emails de seguimiento automáticos

2. ✅ **Los usuarios están listos para recibir emails**
   - El sistema puede enviarles emails según su fecha de registro

3. ⚠️ **Pero falta información:**
   - No puedes ver si ya recibieron emails (necesitas ver las columnas `day_X_sent_at`)
   - No puedes ver cuándo se agregaron (columna `created_at`)

---

## 🔍 Cómo Ver TODA la Información

Para ver todas las columnas (incluyendo fechas de emails enviados):

1. **En Supabase Table Editor:**
   - Haz clic en el botón de configuración (⚙️) o "Columnas"
   - Selecciona todas las columnas para verlas

2. **O usa SQL Editor:**
   ```sql
   SELECT 
     email,
     full_name,
     created_at as fecha_registro,
     day_0_sent_at as email_bienvenida,
     day_1_sent_at as email_dia_1,
     day_2_sent_at as email_dia_2,
     day_3_sent_at as email_dia_3,
     day_4_sent_at as email_dia_4,
     day_5_sent_at as email_dia_5,
     day_6_sent_at as email_dia_6,
     day_7_sent_at as email_dia_7,
     unsubscribed as dado_de_baja
   FROM email_campaigns
   ORDER BY created_at DESC;
   ```

---

## 📊 Estados Posibles de un Usuario

### **Estado 1: Recién Agregado**
```
day_0_sent_at: NULL
day_1_sent_at: NULL
day_2_sent_at: NULL
...
```
**Significa:** Usuario agregado pero aún no ha recibido ningún email

### **Estado 2: Recibió Email de Bienvenida**
```
day_0_sent_at: 2025-11-22 10:00:00
day_1_sent_at: NULL
day_2_sent_at: NULL
...
```
**Significa:** Usuario recibió el email de bienvenida, esperando email del día 1

### **Estado 3: Recibiendo Emails de Seguimiento**
```
day_0_sent_at: 2025-11-22 10:00:00
day_1_sent_at: 2025-11-23 10:00:00
day_2_sent_at: 2025-11-24 10:00:00
day_3_sent_at: NULL
...
```
**Significa:** Usuario está recibiendo los emails según el cronograma

### **Estado 4: Campaña Completa**
```
day_0_sent_at: [fecha]
day_1_sent_at: [fecha]
...
day_7_sent_at: [fecha]
```
**Significa:** Usuario recibió todos los emails de la campaña (7 días)

---

## 🎯 ¿Qué Deberías Ver?

### **Si Ejecutaste el Script de Corrección:**

Deberías ver:
- ✅ Todos los usuarios corregidos en la tabla
- ✅ `day_0_sent_at` con la fecha de su registro original
- ✅ `created_at` con la fecha de cuando se agregaron a la campaña

### **Si NO Ejecutaste el Script:**

Solo verás:
- ✅ Usuarios que se registraron DESPUÉS de configurar el drip campaign
- ❌ NO verás los usuarios corregidos (necesitas ejecutar el script)

---

## ✅ Acción Recomendada

1. **Ejecuta el script:** `AGREGAR-USUARIOS-CORREGIDOS-A-EMAIL-CAMPAIGN.sql`
2. **Verifica que aparezcan todos los usuarios corregidos**
3. **Habilita RLS** para proteger la privacidad (opcional pero recomendado)
4. **Verifica que el cron job esté configurado** para enviar emails automáticamente

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué solo veo 5 registros?**
R: Porque solo 5 usuarios están en la tabla. Si ejecutaste el script de corrección, deberías ver más.

**P: ¿Cómo sé si un usuario recibió emails?**
R: Revisa las columnas `day_X_sent_at`. Si tienen fecha, el email se envió.

**P: ¿Qué pasa si un usuario no está en esta tabla?**
R: No recibirá los emails de seguimiento automáticos. Necesitas agregarlo con el script.

**P: ¿Puedo agregar usuarios manualmente?**
R: Sí, pero es mejor usar el script SQL para asegurar que todos los usuarios corregidos se agreguen.

