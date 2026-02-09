# Corrección: Permisos de Admin para Gestionar Cuotas

## 📋 Problema Identificado

El administrador no podía:
- ✗ Ver cuotas de préstamos asignados a cobradores
- ✗ Marcar como pagadas las cuotas de otros cobradores
- ✗ Editar o gestionar cuotas que no fueran suyas propias

### Causa Raíz

La página de cuotas (`app/dashboard/cuotas/page.tsx`) **NO tenía implementada la lógica de roles**, por lo que:
1. Solo cargaba cuotas donde `user_id = auth.uid()` (cuotas propias)
2. No distinguía entre admin y cobrador
3. El admin estaba limitado como si fuera un cobrador

## ✅ Solución Implementada

### 1. **Integración con Sistema de Roles**

Agregamos la lógica de roles completa:
```typescript
const [userRole, setUserRole] = useState<'admin' | 'cobrador' | null>(null)
const [userId, setUserId] = useState<string | null>(null)
const [organizationId, setOrganizationId] = useState<string | null>(null)
```

### 2. **Carga Inteligente de Cuotas según Rol**

**Antes:**
```typescript
const { data, error } = await supabase
  .from('cuotas')
  .select('...')
  .eq('user_id', user.id)  // ❌ Solo cuotas propias
```

**Después:**
```typescript
// Usar función RPC que respeta roles
const cuotasData = await getCuotasSegunRol()

// La función en la base de datos decide:
// - Admin: TODAS las cuotas de la organización
// - Cobrador: Solo cuotas de sus rutas
```

### 3. **Enriquecimiento de Datos en Frontend**

Dado que la función RPC solo retorna las columnas básicas de la tabla `cuotas`, enriquecemos los datos con:

1. **Información de préstamos y clientes:**
```typescript
const { data: prestamosData } = await supabase
  .from('prestamos')
  .select(`
    id,
    monto_prestado,
    user_id,
    cliente:clientes(nombre, dni)
  `)
  .in('id', prestamoIds)
```

2. **Nombres de cobradores (solo para admin):**
```typescript
if (role === 'admin') {
  const { data: cobradoresData } = await supabase.rpc('get_usuarios_organizacion')
  // Crear mapa de cobrador_id -> nombre
}
```

3. **Cuotas enriquecidas:**
```typescript
const cuotasEnriquecidas = cuotasData.map((cuota: any) => ({
  ...cuota,
  estado: ...,  // Actualizar estado si está retrasada
  prestamo: ..., // Datos del préstamo y cliente
  cobrador_nombre: ... // Nombre del cobrador (solo admin)
}))
```

### 4. **UI Mejorada para Administradores**

Agregamos una columna de **"Cobrador"** visible solo para administradores:

```typescript
<TableHead>Cliente</TableHead>
{userRole === 'admin' && <TableHead>Cobrador</TableHead>}
<TableHead>Cuota #</TableHead>
...

<TableCell>{cuota.prestamo.cliente.nombre}</TableCell>
{userRole === 'admin' && (
  <TableCell className="text-sm text-gray-600">
    {cuota.cobrador_nombre || 'Sin asignar'}
  </TableCell>
)}
<TableCell>{cuota.numero_cuota}</TableCell>
```

**Beneficios:**
- ✅ El admin puede distinguir rápidamente qué cobrador es responsable de cada cuota
- ✅ Facilita el seguimiento y auditoría de pagos por cobrador
- ✅ No afecta la vista de cobradores (no ven esa columna)

## 🎯 Resultado Final

### Para **Administradores:**
- ✅ Ven **TODAS** las cuotas de la organización (propias + de todos los cobradores)
- ✅ Pueden **marcar como pagadas** cualquier cuota
- ✅ Pueden **editar** y gestionar todas las cuotas sin restricciones
- ✅ Ven el nombre del cobrador responsable en cada cuota
- ✅ Pueden **revertir pagos** de cualquier cuota

### Para **Cobradores:**
- ✅ Solo ven cuotas de sus rutas asignadas
- ✅ Pueden marcar como pagadas sus cuotas
- ✅ No ven la columna "Cobrador" (no es necesaria)

## 📁 Archivos Modificados

```
app/dashboard/cuotas/page.tsx
└── ✅ Implementación completa de permisos por rol
└── ✅ Carga de cuotas con getCuotasSegunRol()
└── ✅ Enriquecimiento de datos en frontend
└── ✅ UI adaptativa según rol (columna Cobrador)
```

## 🔄 Patrón Aplicado

Este fix sigue el mismo patrón ya establecido en otras páginas del sistema:

1. **RLS Simple** en las tablas para operaciones básicas
2. **Funciones RPC con `SECURITY DEFINER`** para consultas complejas con lógica de roles
3. **Enriquecimiento de datos en Frontend** para agregar relaciones sin JOINs complejos
4. **UI Adaptativa** según el rol del usuario

## 🧪 Cómo Probar

### Como **Admin:**
1. Ingresar al sistema con cuenta de administrador
2. Ir a `/dashboard/cuotas`
3. **Verificar:** Debe ver cuotas de TODOS los cobradores
4. **Verificar:** Debe haber una columna "Cobrador" con los nombres
5. Intentar marcar como pagada una cuota de un cobrador
6. **Verificar:** Debe funcionar sin errores

### Como **Cobrador:**
1. Ingresar al sistema con cuenta de cobrador
2. Ir a `/dashboard/cuotas`
3. **Verificar:** Solo ve cuotas de sus rutas asignadas
4. **Verificar:** NO ve la columna "Cobrador"
5. Marcar como pagada una de sus cuotas
6. **Verificar:** Debe funcionar normalmente

## 🔒 Seguridad

- ✅ Los datos se filtran a nivel de **base de datos** (función RPC con `SECURITY DEFINER`)
- ✅ La UI solo es un complemento visual, **no es la capa de seguridad**
- ✅ Las políticas RLS protegen las operaciones de `INSERT`, `UPDATE`, `DELETE`
- ✅ Los cobradores NO pueden acceder a cuotas fuera de sus rutas, incluso si manipulan la UI

## 📊 Logs y Debugging

Se agregaron logs detallados para debugging:
```typescript
console.log('[loadCuotas] Iniciando carga de cuotas')
console.log('[loadCuotas] Rol del usuario:', role)
console.log(`[loadCuotas] Se cargaron ${cuotasData.length} cuotas`)
console.log(`[loadCuotas] Enriqueciendo cuotas con datos de ${prestamosData?.length || 0} préstamos`)
```

Estos logs ayudan a diagnosticar problemas de permisos o carga de datos.

## ✅ Checklist de Verificación

- [x] Admin puede ver cuotas de todos los cobradores
- [x] Admin puede marcar como pagadas cuotas de cobradores
- [x] Admin puede revertir pagos de cualquier cuota
- [x] Admin ve columna "Cobrador" con nombres correctos
- [x] Cobrador solo ve sus propias cuotas
- [x] Cobrador NO ve columna "Cobrador"
- [x] Logs implementados para debugging
- [x] Sin errores de linter
- [x] Código documentado y mantenible

---

**Fecha:** 2026-02-07  
**Estado:** ✅ Completado y probado
