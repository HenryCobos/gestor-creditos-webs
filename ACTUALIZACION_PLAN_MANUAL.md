# 📋 Actualización Manual de Plan de Usuario

## 👤 **Usuario Afectado**

- **Email:** financebusinesscompany@gmail.com
- **Plan Comprado:** Profesional Mensual
- **Límites:** 50 clientes + 50 préstamos
- **Problema:** La compra no actualizó el plan automáticamente

---

## 🎯 **Objetivo**

Actualizar manualmente el plan de la organización del usuario al **Plan Profesional** con:
- ✅ 50 clientes
- ✅ 50 préstamos activos
- ✅ Estado: `active`
- ✅ Duración: 30 días desde hoy

---

## 📝 **Método 1: Script Automático (RECOMENDADO)**

### **Archivo:** `supabase/UPDATE_PLAN_MANUAL.sql`

Este script hace TODO automáticamente con logs detallados.

### **Pasos:**

1. **Abre Supabase:**
   - Ve a tu proyecto Supabase
   - Click en **SQL Editor** (menú lateral izquierdo)

2. **Copia y Pega:**
   - Abre el archivo `supabase/UPDATE_PLAN_MANUAL.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase

3. **Ejecuta:**
   - Click en el botón **"Run"** (esquina superior derecha)

4. **Verifica los Logs:**
   
   Deberías ver algo como:

   ```
   ============================================
   ACTUALIZACION MANUAL DE PLAN
   ============================================

   [1/6] Buscando usuario por email: financebusinesscompany@gmail.com
   ✓ Usuario encontrado: abc123...

   [2/6] Verificando organización del usuario...
   ✓ Organización existente: xyz789...

   [3/6] Buscando plan Profesional Mensual...
   ✓ Plan encontrado: def456...
     - Slug: profesional
     - Límites: 50 clientes, 50 préstamos

   [4/6] Actualizando plan de la organización...
   ✓ Plan actualizado exitosamente
     - Estado: active
     - Inicio: 2026-02-07
     - Fin: 2026-03-09

   [5/6] Limpiando límites individuales del perfil...
   ✓ Límites individuales removidos

   [6/6] Verificando configuración final...

   ============================================
   RESUMEN DE ACTUALIZACION
   ============================================

   ✅ ACTUALIZACION COMPLETADA EXITOSAMENTE
   ============================================
   ```

5. **Revisa la Tabla de Verificación:**
   
   Al final del script, verás una tabla con todos los datos:

   | Campo | Valor Esperado |
   |-------|----------------|
   | Email | financebusinesscompany@gmail.com |
   | Plan | Profesional |
   | Límite Clientes | 50 |
   | Límite Préstamos | 50 |
   | Estado | active |
   | Límite Individual Clientes | NULL |
   | Límite Individual Préstamos | NULL |

---

## 📝 **Método 2: Script Simple Paso a Paso**

### **Archivo:** `supabase/UPDATE_PLAN_SIMPLE.sql`

Si el script automático da problemas, usa este método manual.

### **Pasos:**

1. **Abre** `supabase/UPDATE_PLAN_SIMPLE.sql`
2. **Ejecuta cada query UNO POR UNO** (no todas a la vez)
3. **Lee los comentarios** entre cada paso
4. **Copia los IDs** cuando se te indique
5. **Reemplaza** los valores donde dice `PEGAR_AQUI`

---

## ✅ **Verificación Post-Actualización**

### **1. Verifica en la Base de Datos:**

Ejecuta este query en Supabase:

```sql
SELECT 
  p.email,
  pl.nombre as plan,
  pl.limite_clientes,
  pl.limite_prestamos,
  o.subscription_status,
  o.subscription_end_date
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
JOIN planes pl ON pl.id = o.plan_id
WHERE p.email = 'financebusinesscompany@gmail.com';
```

**Resultado Esperado:**

| email | plan | limite_clientes | limite_prestamos | subscription_status | subscription_end_date |
|-------|------|-----------------|------------------|---------------------|----------------------|
| financebusinesscompany@gmail.com | Profesional | 50 | 50 | active | 2026-03-09 |

### **2. Verifica en la Aplicación:**

1. **Pide al usuario que cierre sesión y vuelva a iniciar**
2. Debe ver en el sidebar: **"Plan Actual: Profesional"**
3. En el dashboard debe ver los límites correctos:
   - Clientes: X/50
   - Préstamos: Y/50

### **3. Verifica los Límites:**

El usuario debe poder:
- ✅ Crear hasta 50 clientes
- ✅ Crear hasta 50 préstamos
- ✅ Ver el plan "Profesional" en el sidebar
- ✅ No ver el aviso de "Plan Gratuito"

---

## 🔍 **Troubleshooting**

### **Problema: "No se encontró el plan profesional"**

**Solución:** Verifica que existe el plan en la base de datos:

```sql
SELECT * FROM planes WHERE slug = 'profesional';
```

Si no existe, créalo:

```sql
INSERT INTO planes (nombre, slug, limite_clientes, limite_prestamos, precio_mensual, activo)
VALUES ('Profesional', 'profesional', 50, 50, 29.99, true);
```

### **Problema: "Usuario no tiene organización"**

**Solución:** El script automático crea la organización automáticamente. Si usas el script simple, sigue el PASO 4.

### **Problema: "El usuario sigue viendo Plan Gratuito"**

**Causas posibles:**

1. **No cerró sesión:** El usuario DEBE cerrar sesión y volver a entrar para que se actualice el estado.

2. **Cache del navegador:** Pide que presione `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac) para limpiar cache.

3. **Límites individuales no se limpiaron:**
   
   Verifica:
   ```sql
   SELECT limite_clientes, limite_prestamos 
   FROM profiles 
   WHERE email = 'financebusinesscompany@gmail.com';
   ```
   
   Ambos deben ser `NULL`. Si no, ejecuta:
   ```sql
   UPDATE profiles
   SET limite_clientes = NULL, limite_prestamos = NULL
   WHERE email = 'financebusinesscompany@gmail.com';
   ```

### **Problema: "La fecha de expiración es incorrecta"**

**Solución:** Actualiza manualmente:

```sql
UPDATE organizations
SET 
  subscription_start_date = '2026-02-07',
  subscription_end_date = '2026-03-09'
WHERE id = (
  SELECT organization_id 
  FROM profiles 
  WHERE email = 'financebusinesscompany@gmail.com'
);
```

---

## 🔄 **Después de la Actualización**

1. **Notifica al usuario:**
   
   > "Hola, hemos actualizado tu plan manualmente al Plan Profesional. Por favor:
   > 1. Cierra sesión en la aplicación
   > 2. Vuelve a iniciar sesión
   > 3. Verifica que veas 'Plan Profesional' en el menú lateral
   > 
   > Ya puedes crear hasta 50 clientes y 50 préstamos. ¡Gracias por tu compra!"

2. **Monitorea:**
   - Revisa si el usuario reporta algún problema
   - Verifica que pueda crear clientes/préstamos sin restricciones

3. **Investiga la causa del fallo automático:**
   - Revisa logs de Stripe/pasarela de pago
   - Verifica webhooks
   - Revisa el código de `app/api/webhooks/...` (si existe)

---

## 📊 **Resumen de Cambios Realizados**

| Campo | Antes | Después |
|-------|-------|---------|
| `organizations.plan_id` | NULL o plan antiguo | Plan Profesional ID |
| `organizations.subscription_status` | NULL o inactive | `active` |
| `organizations.subscription_start_date` | NULL | 2026-02-07 |
| `organizations.subscription_end_date` | NULL | 2026-03-09 |
| `profiles.limite_clientes` | Cualquier valor | `NULL` |
| `profiles.limite_prestamos` | Cualquier valor | `NULL` |

---

## ⚠️ **Importante**

- Este es un **fix manual** para un caso específico
- **NO** es la solución definitiva al problema de pagos
- Debes **investigar por qué el webhook/proceso automático falló**
- Implementa **notificaciones** cuando ocurran pagos exitosos
- Considera agregar un **log de transacciones** para auditoria

---

## 📁 **Archivos Relacionados**

- ✅ `supabase/UPDATE_PLAN_MANUAL.sql` - Script automático completo
- ✅ `supabase/UPDATE_PLAN_SIMPLE.sql` - Script paso a paso manual
- ✅ `ACTUALIZACION_PLAN_MANUAL.md` - Esta documentación

---

## ✅ **Checklist de Verificación**

Después de ejecutar el script:

- [ ] El query de verificación muestra el Plan Profesional
- [ ] `limite_clientes` = 50
- [ ] `limite_prestamos` = 50
- [ ] `subscription_status` = active
- [ ] `subscription_end_date` ≈ 30 días desde hoy
- [ ] `profiles.limite_clientes` = NULL
- [ ] `profiles.limite_prestamos` = NULL
- [ ] Usuario notificado de cerrar/abrir sesión
- [ ] Usuario confirmó que ve "Plan Profesional" en la app
- [ ] Usuario confirmó que puede crear clientes/préstamos sin límite del plan gratuito

---

**Fecha de Actualización:** 07/02/2026  
**Realizado por:** Asistente AI  
**Usuario Afectado:** financebusinesscompany@gmail.com
