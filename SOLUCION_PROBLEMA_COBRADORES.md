# Solución: Cobradores no ven sus propios datos

## 🔴 Problema Reportado

1. **Cobrador ve "Plan Gratuito"** en lugar del plan de la organización
2. **Cobrador crea préstamos/clientes** → Sale "exitoso"
3. **NO aparecen en dashboard ni en lista** de préstamos
4. **SÍ aparecen en los límites** (contador 3/5)
5. **El admin SÍ los ve** correctamente

## 🔍 Análisis del Problema

### Causa raíz:

Las funciones RPC (`get_clientes_segun_rol()` y `get_prestamos_segun_rol()`) para **cobradores** estaban diseñadas para:

```sql
-- ❌ LÓGICA ANTERIOR (INCORRECTA)
ELSIF mi_role = 'cobrador' THEN
  RETURN QUERY
  SELECT c.*
  FROM clientes c
  JOIN ruta_clientes rc ON rc.cliente_id = c.id
  JOIN rutas r ON r.id = rc.ruta_id
  WHERE r.cobrador_id = auth.uid()  -- ⚠️ SOLO clientes en rutas
```

**Problema:** Cuando un cobrador crea un cliente/préstamo directamente:
- El registro se crea con `user_id = cobrador_id` ✅
- Pero NO tiene `ruta_id` asignado ❌
- Por eso la función RPC NO lo devuelve ❌
- Los límites SÍ lo cuentan porque usan otra query ✅

### Por qué el admin SÍ los ve:

```sql
IF mi_role = 'admin' THEN
  SELECT c.*
  FROM clientes c
  JOIN profiles p ON p.id = c.user_id
  WHERE p.organization_id = mi_org  -- ✅ Busca por organización
```

El admin busca por `organization_id`, no por rutas, así que ve TODO.

---

## ✅ Solución Implementada

### Archivo: `supabase/FIX_FUNCIONES_COBRADORES.sql`

He actualizado las funciones RPC para que los **cobradores vean**:

1. **Sus propios datos** (creados por ellos, aunque no tengan ruta)
2. **Datos de sus rutas asignadas**

### Nueva lógica:

```sql
-- ✅ LÓGICA NUEVA (CORRECTA)
ELSIF mi_role = 'cobrador' THEN
  RETURN QUERY
  SELECT DISTINCT c.*
  FROM clientes c
  WHERE 
    -- A) Sus propios clientes (creados por él)
    c.user_id = auth.uid()
    OR
    -- B) Clientes de sus rutas
    EXISTS (
      SELECT 1 
      FROM ruta_clientes rc
      JOIN rutas r ON r.id = rc.ruta_id
      WHERE rc.cliente_id = c.id
        AND r.cobrador_id = auth.uid()
        AND rc.activo = true
    )
  ORDER BY c.created_at DESC;
```

### Funciones actualizadas:

1. ✅ `get_clientes_segun_rol()`
2. ✅ `get_prestamos_segun_rol()`
3. ✅ `get_cuotas_segun_rol()`

---

## 📝 Pasos para Aplicar la Solución

### 1. Ejecutar el script SQL

En Supabase SQL Editor, ejecuta:

```sql
-- Archivo: supabase/FIX_FUNCIONES_COBRADORES.sql
```

Este script:
- Elimina las funciones antiguas (`CASCADE`)
- Crea las nuevas funciones corregidas
- Otorga permisos a `authenticated`
- Muestra un test de verificación

### 2. Verificar el fix (opcional)

Si quieres diagnosticar antes, ejecuta como **cobrador**:

```sql
-- Archivo: supabase/DIAGNOSTICO_COBRADOR.sql
```

Este script te mostrará:
- Tu perfil y rol
- Clientes/préstamos que creaste
- Rutas asignadas
- Resultado de las funciones RPC
- Organización y plan

### 3. Probar en la aplicación

1. Ingresa como **cobrador**
2. Deberías ver:
   - ✅ Plan de la organización (ej: "Plan Profesional")
   - ✅ Tus 3 préstamos creados
   - ✅ Dashboard con métricas correctas

---

## 🎯 Comportamiento Esperado Después del Fix

### Como Cobrador:

| Acción | Resultado |
|--------|-----------|
| Crear cliente sin ruta | ✅ Aparece en lista |
| Crear préstamo sin ruta | ✅ Aparece en dashboard |
| Ver plan | ✅ Muestra plan de organización |
| Ver límites | ✅ Muestra uso compartido |
| Asignar cliente a ruta | ✅ Sigue viéndolo |

### Como Admin:

| Acción | Resultado |
|--------|-----------|
| Ver clientes | ✅ Ve TODOS (admin + cobradores) |
| Ver préstamos | ✅ Ve TODOS (admin + cobradores) |
| Ver plan | ✅ Muestra plan de organización |
| Ver límites | ✅ Suma de toda la organización |

---

## 🔄 Diagrama de Flujo

```
┌─────────────────────────────────────────┐
│ Cobrador crea cliente/préstamo         │
└────────────────┬────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Se guarda con:             │
    │ - user_id = cobrador_id    │
    │ - ruta_id = NULL (por ahora)│
    └────────────┬───────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ Función RPC get_*_segun_rol()         │
│                                        │
│ ✅ ANTES: Solo buscaba en rutas       │
│    → NO encontraba el dato            │
│                                        │
│ ✅ AHORA: Busca en:                   │
│    1. user_id = auth.uid() ✅         │
│    2. Rutas del cobrador ✅           │
│    → SÍ encuentra el dato             │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ Dashboard muestra los datos ✅        │
└────────────────────────────────────────┘
```

---

## 📚 Archivos Relacionados

### Scripts SQL creados:
- ✅ `supabase/FIX_FUNCIONES_COBRADORES.sql` - **Solución principal**
- ✅ `supabase/DIAGNOSTICO_COBRADOR.sql` - Diagnóstico

### Archivos frontend (ya correctos):
- ✅ `app/dashboard/dashboard-client.tsx` - Usa `loadOrganizationSubscription()`
- ✅ `app/dashboard/clientes/page.tsx` - Usa funciones de organización
- ✅ `app/dashboard/prestamos/page.tsx` - Usa funciones de organización
- ✅ `lib/subscription-helpers.ts` - Tiene todas las funciones

---

## 🧪 Test de Verificación

### Después de ejecutar el script:

1. **Como cobrador**, ejecuta en SQL Editor:
   ```sql
   SELECT COUNT(*) FROM get_clientes_segun_rol();
   SELECT COUNT(*) FROM get_prestamos_segun_rol();
   ```
   Deberías ver tus 3+ registros.

2. **En la aplicación**, refresca el dashboard del cobrador.
   Deberías ver todos tus datos.

3. **Como admin**, verifica que sigues viendo TODO.

---

## ⚠️ Prevención de Futuros Errores

### Regla de oro para cobradores:

> **Los cobradores siempre deben poder ver**:
> 1. Sus propios datos (`user_id = auth.uid()`)
> 2. Datos de sus rutas asignadas

### Al crear nuevas funciones RPC:

```sql
-- ✅ Plantilla correcta
ELSIF mi_role = 'cobrador' THEN
  RETURN QUERY
  SELECT *
  FROM tabla
  WHERE 
    tabla.user_id = auth.uid()  -- ⭐ SIEMPRE incluir esto
    OR
    [lógica de rutas si aplica]
```

---

## 📞 Si el problema persiste:

1. Ejecuta `DIAGNOSTICO_COBRADOR.sql` y envía los resultados
2. Verifica en navegador (F12 → Network) las llamadas a `get_clientes_segun_rol`
3. Verifica en navegador (F12 → Console) los logs del frontend

---

**Fecha de creación:** 2026-02-07  
**Autor:** Assistant  
**Versión:** 1.0
