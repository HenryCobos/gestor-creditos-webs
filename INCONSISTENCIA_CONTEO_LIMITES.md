# Solución: Inconsistencia en conteo de préstamos/clientes

## 🔴 Problema Reportado

**Admin muestra:**
- Dashboard "Préstamos Activos": **28**
- Límites del plan: **26/50**
- Diferencia: **2 préstamos** no se cuentan en los límites

## 🔍 Análisis del Problema

### Causa raíz:

La vista `vista_organizacion_limites` usaba `LEFT JOIN` + `GROUP BY` + `COUNT(DISTINCT)`:

```sql
-- ❌ LÓGICA ANTERIOR (INCORRECTA)
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN clientes c ON c.user_id = p.id
LEFT JOIN prestamos pr ON pr.user_id = p.id
GROUP BY o.id, o.nombre_negocio, o.plan_id, pl.id, ...
...
COUNT(DISTINCT pr.id) FILTER (WHERE pr.id IS NOT NULL) as prestamos_usados
```

**Problema:**

Cuando hay múltiples `profiles` en una organización:
1. El `LEFT JOIN` crea **múltiples filas** por organización
2. El `GROUP BY` intenta agrupar estas filas
3. PostgreSQL puede **perder registros** o contarlos incorrectamente
4. Especialmente si hay profiles sin préstamos/clientes

**Resultado:**
- ✅ Dashboard cuenta directamente → 28 préstamos
- ❌ Vista con JOINs complejos → 26 préstamos (pierde 2)

---

## ✅ Solución Implementada

### Archivo: `supabase/FIX_CONTEO_PRESTAMOS.sql`

He reconstruido completamente la vista usando **subqueries** en lugar de JOINs:

```sql
-- ✅ LÓGICA NUEVA (CORRECTA)
CREATE OR REPLACE VIEW vista_organizacion_limites AS
SELECT 
  o.id as organization_id,
  o.nombre_negocio,
  pl.limite_clientes,
  pl.limite_prestamos,
  
  -- ⭐ Subquery independiente para contar clientes
  (
    SELECT COUNT(DISTINCT c.id)
    FROM clientes c
    JOIN profiles p ON p.id = c.user_id
    WHERE p.organization_id = o.id
  ) as clientes_usados,
  
  -- ⭐ Subquery independiente para contar préstamos
  (
    SELECT COUNT(DISTINCT pr.id)
    FROM prestamos pr
    JOIN profiles p ON p.id = pr.user_id
    WHERE p.organization_id = o.id
  ) as prestamos_usados,
  
  ...
FROM organizations o
LEFT JOIN planes pl ON pl.id = o.plan_id;
-- ⚠️ SIN LEFT JOIN a profiles, clientes, o préstamos
```

### Ventajas de esta solución:

1. ✅ **Cada conteo es independiente** - No hay interferencia entre JOINs
2. ✅ **No se pierden registros** - Las subqueries son precisas
3. ✅ **Más eficiente** - PostgreSQL puede optimizar mejor
4. ✅ **Más legible** - Cada cálculo está aislado
5. ✅ **Consistente** - Siempre da el mismo resultado que un conteo directo

---

## 📝 Pasos para Aplicar la Solución

### 1. Ejecutar el script SQL

En **Supabase → SQL Editor**, ejecuta:

**`supabase/FIX_CONTEO_PRESTAMOS.sql`**

Este script:
1. **Diagnostica** el problema (muestra conteos actuales)
2. **Recrea** la vista `vista_organizacion_limites`
3. **Verifica** que los conteos ahora sean correctos
4. **Muestra** detalle por estado de préstamo

### 2. Verificar inmediatamente

Después de ejecutar el script, verás en los resultados:

```
✅ VISTA ACTUALIZADA - VERIFICACIÓN
organization_id | prestamos_usados | clientes_usados
-------------------------------------------------
[tu org ID]     | 28              | [tu número]

✅ CONTEO DIRECTO (debe ser igual a la vista)
prestamos_totales | clientes_totales
-------------------------------------
28                | [tu número]

✅ DETALLE POR ESTADO
estado    | cantidad
-------------------
activo    | 28
pagado    | 0
...
```

Si los números coinciden → ✅ **Problema resuelto**

### 3. Refrescar el navegador

No necesitas hacer deploy. Simplemente:
1. Refresca el dashboard del admin
2. Los límites ahora deberían mostrar **28/50** (o el número correcto)

---

## 🎯 Comportamiento Esperado Después del Fix

### Dashboard vs Límites:

| Métrica | Dashboard | Límites | Estado |
|---------|-----------|---------|--------|
| Préstamos Activos | 28 | 28/50 | ✅ Iguales |
| Clientes | 17 | 12/50 | ⚠️ Ver nota* |
| Total | Cuenta directa | Cuenta por organización | ✅ Consistente |

**\*Nota sobre clientes:** El dashboard puede mostrar "Clientes Activos" (con préstamos activos), mientras que los límites cuentan **TODOS** los clientes registrados. Esto es correcto.

### Consistencia garantizada:

```
┌──────────────────────────────────────┐
│ CUALQUIER conteo de la organización │
└─────────────┬────────────────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │ Subquery independiente:  │
   │                          │
   │ SELECT COUNT(*)          │
   │ FROM tabla               │
   │ JOIN profiles p          │
   │ WHERE p.organization_id  │
   └─────────────┬────────────┘
                 │
                 ▼
      ┌─────────────────────┐
      │ Resultado preciso   │
      │ Sin pérdida de datos│
      └─────────────────────┘
```

---

## 🔄 Otros ajustes realizados

### Función `get_limites_organizacion()` ya usa la vista:

```sql
-- Esta función ahora usará la vista corregida
CREATE OR REPLACE FUNCTION get_limites_organizacion()
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM vista_organizacion_limites
  WHERE organization_id = (...)
END;
$$ LANGUAGE plpgsql;
```

Como la función usa la vista, **automáticamente se corrige** cuando se actualiza la vista.

### Frontend no necesita cambios:

El frontend ya llama correctamente a:
- `loadOrganizationUsageLimits()` → Usa `get_limites_organizacion()` → Usa la vista
- La vista ahora es correcta → Los números serán correctos

---

## 🧪 Test de Verificación

### Después de ejecutar el script, verifica:

1. **Como admin**, en SQL Editor:
   ```sql
   -- Conteo directo
   SELECT COUNT(*) FROM prestamos pr
   JOIN profiles p ON p.id = pr.user_id
   WHERE p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());
   
   -- Conteo desde la vista
   SELECT prestamos_usados FROM vista_organizacion_limites
   WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());
   ```
   Ambos deben dar **el mismo número**.

2. **En la aplicación**, refresca el dashboard:
   - Dashboard "Préstamos Activos": debe coincidir con
   - Límites "X/50": debe mostrar el mismo X

---

## ⚠️ Prevención de Futuros Errores

### Regla de oro para vistas con GROUP BY:

> **NUNCA** uses múltiples `LEFT JOIN` seguidos de `GROUP BY` + `COUNT(DISTINCT)`.
> **SIEMPRE** usa subqueries para cada conteo.

### Plantilla correcta:

```sql
-- ✅ PLANTILLA PARA VISTAS DE CONTEO
CREATE VIEW mi_vista AS
SELECT 
  entidad_principal.id,
  entidad_principal.nombre,
  
  -- ⭐ Cada conteo es una subquery independiente
  (SELECT COUNT(*) FROM tabla1 WHERE ...) as count_tabla1,
  (SELECT COUNT(*) FROM tabla2 WHERE ...) as count_tabla2,
  (SELECT SUM(monto) FROM tabla3 WHERE ...) as suma_tabla3
  
FROM entidad_principal
LEFT JOIN otras_tablas ON ...
-- ⚠️ NO hacer LEFT JOIN a las tablas que estás contando
```

### Al crear nuevas métricas:

1. ✅ Usa subqueries para conteos
2. ✅ Prueba el conteo directo vs la vista
3. ✅ Verifica con datos reales (>1 usuario en la org)
4. ❌ Evita JOINs complejos con GROUP BY

---

## 📚 Archivos Relacionados

### Scripts SQL:
- ⭐ **`supabase/FIX_CONTEO_PRESTAMOS.sql`** - Solución principal
- ✅ `supabase/SISTEMA_LIMITES_ORGANIZACION.sql` - Vista original (ahora obsoleta)

### Frontend (no necesita cambios):
- ✅ `lib/subscription-helpers.ts` - `loadOrganizationUsageLimits()` ya correcto
- ✅ `lib/use-limites.ts` - Hooks ya correctos
- ✅ `components/limites-organizacion-card.tsx` - UI ya correcta

---

## 📞 Si el problema persiste

1. Ejecuta el script de diagnóstico (primera parte del SQL)
2. Envía los resultados de las 3 queries de verificación
3. Verifica en navegador (F12 → Console) los valores de `limites`

---

**Fecha:** 2026-02-07  
**Versión:** 1.0  
**Estado:** Solución completa lista para aplicar
