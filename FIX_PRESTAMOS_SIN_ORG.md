# Corrección: Manejo de Préstamos sin `organization_id`

## 📋 Problema Identificado

Al intentar registrar un pago, el sistema mostraba el error:
- ❌ **"Préstamo no encontrado"**

### Causa Raíz

Los **préstamos antiguos** (creados antes de implementar el sistema de organizaciones) **NO tienen** el campo `organization_id` poblado, por lo que:

1. La query funcionaba: `SELECT * FROM prestamos WHERE id = '...'` ✅
2. Pero el préstamo tenía `organization_id = NULL`
3. La validación `if (prestamo.organization_id !== profile.organization_id)` fallaba
4. El sistema rechazaba el pago incluso cuando el usuario tenía permisos

## ✅ Solución Implementada

### 1. **API Route Más Robusto**

Se actualizó el código para manejar préstamos con y sin `organization_id`:

**Antes (Fallaba con préstamos antiguos):**
```typescript
// ❌ Asume que TODOS los préstamos tienen organization_id
if (prestamo.organization_id !== profile.organization_id) {
  return error('No tienes permiso')
}
```

**Después (Maneja ambos casos):**
```typescript
// ✅ Verifica si el préstamo tiene organization_id
if (prestamo.organization_id) {
  // Préstamo moderno: verificar organization_id
  if (prestamo.organization_id !== profile.organization_id) {
    return error('No tienes permiso')
  }
} else {
  // Préstamo antiguo: verificar por el dueño del préstamo
  const prestamoOwnerProfile = await getProfile(prestamo.user_id)
  
  if (prestamoOwnerProfile.organization_id !== profile.organization_id) {
    return error('No tienes permiso')
  }
}
```

**Lógica:**
- **Préstamos con `organization_id`**: Verificación directa (rápida)
- **Préstamos sin `organization_id`**: Verificación indirecta consultando el perfil del dueño

### 2. **Logs Detallados para Debugging**

Se agregaron logs completos en cada paso del proceso:

```typescript
console.log('[API registrar-pago] Usuario autenticado:', user.id)
console.log('[API registrar-pago] Datos recibidos:', { cuota_id, prestamo_id, monto_pagado })
console.log('[API registrar-pago] Préstamo encontrado:', { id, user_id, organization_id, ruta_id })
console.log('[API registrar-pago] Préstamo sin organization_id, verificando por dueño...')
console.error('[API registrar-pago] Error al buscar préstamo:', error)
```

**Beneficios:**
- ✅ Fácil de diagnosticar problemas
- ✅ Ver exactamente en qué paso falla
- ✅ Logs solo en el servidor (no expuestos al cliente)

### 3. **Cambio de `.single()` a `.maybeSingle()`**

```typescript
// Antes
const { data: prestamo } = await supabase
  .from('prestamos')
  .select('...')
  .eq('id', prestamo_id)
  .single() // ❌ Lanza error si no encuentra o encuentra más de 1

// Después
const { data: prestamo, error: prestamoError } = await supabase
  .from('prestamos')
  .select('...')
  .eq('id', prestamo_id)
  .maybeSingle() // ✅ Devuelve null si no encuentra, sin lanzar error
```

**Ventaja:** Podemos manejar el error de forma controlada y loguear información útil.

### 4. **Script SQL para Actualizar Préstamos Antiguos**

Creado: `supabase/FIX_PRESTAMOS_SIN_ORGANIZATION.sql`

Este script:
1. ✅ Identifica préstamos sin `organization_id`
2. ✅ Asigna el `organization_id` del usuario que creó el préstamo
3. ✅ Verifica que todos los préstamos queden actualizados

**Uso:**
```sql
-- Ejecutar en Supabase → SQL Editor
-- Copiar y pegar todo el contenido del archivo
-- Run
```

**Resultado:**
```
UPDATE prestamos SET organization_id = (
  SELECT organization_id FROM profiles WHERE id = prestamos.user_id
)
WHERE organization_id IS NULL
```

## 🎯 Resultado Final

### **Solución de Corto Plazo (API Route):**
- ✅ El admin puede registrar pagos de préstamos antiguos **sin necesidad de actualizar la BD**
- ✅ El sistema maneja ambos casos (con y sin `organization_id`)
- ✅ Logs detallados para debugging

### **Solución de Largo Plazo (Script SQL):**
- ✅ Actualizar todos los préstamos antiguos con `organization_id`
- ✅ Simplificar el código del API route (solo verificar `organization_id`)
- ✅ Mejorar rendimiento (menos queries)

## 📁 Archivos Modificados/Creados

```
✅ app/api/registrar-pago/route.ts (MODIFICADO)
   └── Manejo de préstamos con y sin organization_id
   └── Logs detallados en cada paso
   └── Cambio de .single() a .maybeSingle()
   
✅ supabase/FIX_PRESTAMOS_SIN_ORGANIZATION.sql (NUEVO)
   └── Script para actualizar préstamos antiguos
   └── Asignar organization_id basado en el dueño
```

## 🔄 Flujo de Validación Actualizado

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario intenta registrar pago                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. API: Verificar autenticación ✓                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. API: Obtener organización del usuario ✓                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. API: Buscar préstamo (maybeSingle)                      │
│    LOG: Préstamo encontrado con datos                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ¿Préstamo tiene organization_id?                         │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐            ┌──────────────────────┐
│ SÍ: Verificar    │            │ NO: Verificar por    │
│ directamente     │            │ dueño del préstamo   │
│                  │            │                      │
│ if (prestamo.    │            │ owner_org =          │
│   org_id !==     │            │   getOwnerOrg()      │
│   user_org_id)   │            │                      │
│   → ERROR        │            │ if (owner_org !==    │
│                  │            │   user_org_id)       │
│                  │            │   → ERROR            │
└────────┬─────────┘            └──────────┬───────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Permisos válidos: Continuar con registro de pago ✓      │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Cómo Probar

### Prueba 1: **Préstamo con `organization_id`**
1. Registrar un pago de un préstamo reciente
2. **Resultado esperado:** ✅ Funciona sin problemas

### Prueba 2: **Préstamo sin `organization_id` (antiguo)**
1. Identificar un préstamo antiguo (creado antes del sistema de organizaciones)
2. Intentar registrar un pago
3. **Resultado esperado:** ✅ Funciona (verifica por dueño del préstamo)
4. **En logs del servidor:** "Préstamo sin organization_id, verificando por dueño..."

### Prueba 3: **Ejecutar script SQL (Recomendado)**
1. Ir a **Supabase → SQL Editor**
2. Copiar contenido de `FIX_PRESTAMOS_SIN_ORGANIZATION.sql`
3. Ejecutar (Run)
4. **Verificar:** Todos los préstamos ahora tienen `organization_id`
5. **Probar de nuevo:** Registrar pago en préstamo que antes fallaba
6. **Resultado:** ✅ Ahora usa verificación directa (más rápida)

## 📊 Logs para Debugging

Si el error persiste, revisar los logs del servidor (Vercel o consola local):

```
[API registrar-pago] Usuario autenticado: abc123...
[API registrar-pago] Datos recibidos: {
  cuota_id: "...",
  prestamo_id: "...",
  monto_pagado: 73.33
}
[API registrar-pago] Préstamo encontrado: {
  id: "...",
  user_id: "...",
  organization_id: null,  ← Préstamo antiguo
  ruta_id: "..."
}
[API registrar-pago] Préstamo sin organization_id, verificando por dueño...
[API registrar-pago] ✅ Validación exitosa
```

## 🔒 Seguridad

La solución mantiene la seguridad porque:
- ✅ Verifica que el préstamo pertenece a la organización (directa o indirectamente)
- ✅ Admin solo puede registrar pagos dentro de su organización
- ✅ Cobrador solo puede registrar pagos de sus propios préstamos/rutas
- ✅ No hay bypass de permisos

## 📝 Recomendaciones

### **Inmediato:**
1. ✅ Hacer push de los cambios
2. ✅ Probar el registro de pagos (debe funcionar)

### **Pronto:**
1. 🔄 Ejecutar `FIX_PRESTAMOS_SIN_ORGANIZATION.sql` en producción
2. 🔄 Esto poblará el `organization_id` de todos los préstamos antiguos
3. 🔄 Simplificar el código del API route (remover verificación indirecta)

### **Futuro:**
1. 🔄 Agregar índice en `prestamos.organization_id` para mejorar rendimiento
2. 🔄 Agregar constraint `NOT NULL` en `prestamos.organization_id` (después de migración)

## ✅ Checklist de Verificación

- [x] API route maneja préstamos con `organization_id`
- [x] API route maneja préstamos sin `organization_id` (antiguos)
- [x] Logs detallados implementados
- [x] Cambio de `.single()` a `.maybeSingle()`
- [x] Script SQL creado para actualizar préstamos
- [x] Sin errores de linter
- [x] Código documentado
- [ ] Ejecutar script SQL en producción (pendiente usuario)
- [ ] Probar en producción (pendiente usuario)

---

**Fecha:** 2026-02-07  
**Estado:** ✅ Código actualizado, pendiente prueba en producción
