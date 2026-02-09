# Corrección: Admin Puede Registrar Pagos de Cobradores

## 📋 Problema Identificado

El administrador no podía registrar pagos de cuotas que pertenecen a préstamos asignados a cobradores:
- ✗ Al intentar registrar el pago, aparecía el error: **"No se pudo registrar el pago"**
- ✗ La inserción en la tabla `pagos` fallaba por problemas de permisos RLS

### Causa Raíz

En la función `handleRegistrarPago` de la página de cuotas, cuando se insertaba un pago:

```typescript
const { error: pagoError } = await supabase
  .from('pagos')
  .insert([{
    user_id: user.id,  // ❌ ID del admin, no del cobrador
    cuota_id: selectedCuota.id,
    prestamo_id: selectedCuota.prestamo.id,
    // ...
  }])
```

**El problema:** El admin intentaba insertar un pago usando su propio `user_id`, pero:
1. Las políticas RLS de la tabla `pagos` esperan que el `user_id` coincida con el dueño del préstamo
2. Esto causaba una violación de permisos y el pago no se registraba

## ✅ Solución Implementada

### 1. **Creación de API Route Seguro: `/api/registrar-pago`**

Se creó un endpoint API que usa el **Service Role Key** de Supabase para manejar registros de pagos con permisos elevados, siguiendo el patrón ya establecido en el sistema (similar a `/api/usuarios`).

**Características del endpoint:**

#### **Validaciones de Seguridad:**
```typescript
// 1. Verificar autenticación
const user = await getAuthenticatedUser()
if (!user) return 401 Unauthorized

// 2. Verificar organización del usuario
const profile = await getProfile(user.id)
if (!profile.organization_id) return 403 Forbidden

// 3. Verificar que el préstamo pertenece a la organización
const prestamo = await getPrestamo(prestamo_id)
if (prestamo.organization_id !== profile.organization_id) return 403 Forbidden

// 4. Verificar permisos según rol
if (userRole === 'cobrador') {
  // Cobrador solo puede registrar pagos de sus propios préstamos o de su ruta
  validateCobradorPermissions()
}
// Admin puede registrar pagos de cualquier préstamo de la organización
```

#### **Registro del Pago:**
```typescript
// ✅ Usar el user_id del DUEÑO del préstamo (cobrador), no del que registra (admin)
const { data: pagoInsertado, error: pagoError } = await supabaseAdmin
  .from('pagos')
  .insert([{
    user_id: prestamo.user_id, // ✅ ID del cobrador (dueño del préstamo)
    cuota_id,
    prestamo_id,
    monto_pagado: parseFloat(monto_pagado),
    metodo_pago: metodo_pago || null,
    notas: notas || null,
    fecha_pago: new Date().toISOString()
  }])
```

**Clave:** El pago se registra con el `user_id` del **dueño del préstamo** (el cobrador), no con el del usuario que lo registra (el admin). Esto mantiene la integridad de los datos y respeta las políticas RLS.

#### **Transaccionalidad:**
```typescript
// 1. Insertar pago
const pagoInsertado = await insertPago()

// 2. Actualizar cuota
const cuotaActualizada = await updateCuota()

// Si falla actualizar cuota:
if (error) {
  await deletePago(pagoInsertado.id) // Revertir pago
  return 500 Internal Server Error
}

// 3. Si es pago completo, actualizar préstamo
if (esPagoCompleto && todasCuotasPagadas) {
  await updatePrestamo({ estado: 'pagado' })
}
```

### 2. **Modificación del Frontend: `handleRegistrarPago`**

**Antes:**
```typescript
// ❌ Inserción directa con Supabase client (falla por RLS)
const { error: pagoError } = await supabase
  .from('pagos')
  .insert([{ user_id: user.id, ... }])
```

**Después:**
```typescript
// ✅ Llamada al API route seguro
const response = await fetch('/api/registrar-pago', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cuota_id: selectedCuota.id,
    prestamo_id: selectedCuota.prestamo.id,
    monto_pagado: monto,
    metodo_pago: metodoPago || null,
    notas: notas || null,
  }),
})

const data = await response.json()

if (!response.ok) {
  toast({ title: 'Error', description: data.error })
  return
}

toast({ title: 'Éxito', description: data.message })
loadCuotas()
```

### 3. **Logs Detallados para Debugging**

Se agregaron logs tanto en el frontend como en el backend:

**Frontend:**
```typescript
console.log('[handleRegistrarPago] Registrando pago:', {
  cuota_id, prestamo_id, monto_pagado, metodo_pago
})
```

**Backend (API Route):**
```typescript
console.error('[API] Error al insertar pago:', pagoError)
console.error('[API] Error al actualizar cuota:', cuotaError)
```

## 🎯 Resultado Final

### Para **Administradores:**
- ✅ Pueden registrar pagos de cuotas de **cualquier cobrador**
- ✅ Los pagos se registran correctamente con el `user_id` del cobrador
- ✅ Las cuotas se actualizan sin problemas
- ✅ Los préstamos cambian a estado "pagado" cuando todas las cuotas están completas
- ✅ Sin errores de permisos RLS

### Para **Cobradores:**
- ✅ Pueden registrar pagos de sus propias cuotas
- ✅ Funcionamiento normal sin cambios

### **Integridad de Datos:**
- ✅ Los pagos se registran con el `user_id` correcto (dueño del préstamo)
- ✅ Las estadísticas y reportes se mantienen consistentes
- ✅ Los cobradores ven sus propios pagos correctamente
- ✅ El admin ve todos los pagos de la organización

## 📁 Archivos Creados/Modificados

```
app/api/registrar-pago/route.ts (NUEVO)
└── ✅ API route seguro con Service Role Key
└── ✅ Validaciones de permisos por rol
└── ✅ Registro transaccional de pagos
└── ✅ Manejo de errores robusto

app/dashboard/cuotas/page.tsx (MODIFICADO)
└── ✅ Función handleRegistrarPago actualizada
└── ✅ Llamada al API route en lugar de inserción directa
└── ✅ Logs para debugging
```

## 🔒 Seguridad

Este patrón es **más seguro** que la inserción directa porque:

1. **Validación Centralizada:**
   - Todas las validaciones de permisos están en un solo lugar (API route)
   - Difícil de bypass desde el frontend

2. **Service Role Key:**
   - Solo el servidor tiene acceso al Service Role Key
   - El frontend nunca expone credenciales privilegiadas

3. **Auditoría:**
   - Todos los logs están en el servidor
   - Fácil de rastrear quién hizo qué

4. **Integridad de Datos:**
   - El `user_id` siempre es el correcto (dueño del préstamo)
   - No hay manera de manipular el `user_id` desde el frontend

## 🔄 Patrón Aplicado

Este fix sigue el **mismo patrón** ya establecido en:
- `/api/usuarios` - Creación de cobradores por admin
- `/api/...` - Otras operaciones privilegiadas

**Principio:** Para operaciones que requieren permisos elevados o manipulación de datos de otros usuarios, usar un API route con Service Role Key en lugar de operaciones directas desde el frontend.

## 🧪 Cómo Probar

### Prueba 1: **Admin registra pago de cobrador**
1. Ingresar como **admin**
2. Ir a `/dashboard/cuotas`
3. Buscar una cuota de un préstamo asignado a un **cobrador**
4. Click en "Registrar Pago"
5. Ingresar monto, método de pago, notas
6. Click en "Registrar Pago"
7. **Resultado esperado:** ✅ "Pago registrado correctamente"
8. **Verificar:** La cuota se actualiza, el pago aparece en el historial

### Prueba 2: **Cobrador registra su propio pago**
1. Ingresar como **cobrador**
2. Ir a `/dashboard/cuotas`
3. Buscar una cuota de un préstamo propio
4. Click en "Registrar Pago"
5. Ingresar monto, método de pago
6. Click en "Registrar Pago"
7. **Resultado esperado:** ✅ "Pago registrado correctamente"

### Prueba 3: **Pago completo actualiza estado del préstamo**
1. Ingresar como **admin**
2. Buscar una cuota que sea la **última pendiente** de un préstamo
3. Registrar pago completo
4. **Verificar:** El préstamo cambia a estado "pagado"

### Prueba 4: **Cobrador NO puede registrar pago de otro cobrador**
1. Ingresar como **cobrador A**
2. Intentar registrar pago de una cuota del **cobrador B** (usando API directamente)
3. **Resultado esperado:** ❌ 403 Forbidden - "No tienes permiso..."

## 📊 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario (Admin/Cobrador) hace clic en "Registrar Pago"  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend: handleRegistrarPago()                          │
│    - Validar monto > 0                                      │
│    - Preparar payload                                        │
│    - fetch('/api/registrar-pago', { method: 'POST', ... })  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend: /api/registrar-pago (Service Role Key)         │
│    ✓ Verificar autenticación                                │
│    ✓ Verificar organización                                 │
│    ✓ Verificar permisos (admin/cobrador)                    │
│    ✓ Validar préstamo pertenece a organización              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Insertar Pago (con user_id del dueño del préstamo)      │
│    INSERT INTO pagos (user_id: prestamo.user_id, ...)      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Actualizar Cuota                                         │
│    UPDATE cuotas SET monto_pagado, estado, fecha_pago      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ¿Todas las cuotas pagadas?                               │
│    SI → UPDATE prestamos SET estado = 'pagado'              │
│    NO → Continuar                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Responder al Frontend                                    │
│    { success: true, message: "Pago registrado..." }         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Frontend: Mostrar toast de éxito y recargar cuotas      │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Checklist de Verificación

- [x] Admin puede registrar pagos de cuotas de cobradores
- [x] Cobrador puede registrar sus propios pagos
- [x] Los pagos se registran con el `user_id` correcto (dueño del préstamo)
- [x] Las cuotas se actualizan correctamente
- [x] Los préstamos cambian a "pagado" cuando corresponde
- [x] No hay errores de permisos RLS
- [x] Validaciones de seguridad implementadas
- [x] Transaccionalidad en caso de errores
- [x] Logs para debugging
- [x] Sin errores de linter
- [x] Código documentado

---

**Fecha:** 2026-02-07  
**Estado:** ✅ Completado y probado
