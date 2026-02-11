# 🚨 INSTRUCCIONES URGENTES - EJECUTAR AHORA

**Fecha**: 11 Feb 2026  
**Problema**: Admin ve límites 0/0, Cobrador ve "Plan Gratuito"  
**Causa**: Organizaciones sin `plan_id` asignado

---

## 🎯 OBJETIVO DEL SISTEMA (Recordatorio)

### Cómo DEBE funcionar:
- **Admin con Plan Profesional** (50 clientes / 50 préstamos)
- **TODOS los usuarios de esa organización** (admin + cobradores) ven:
  - ✅ "Plan Profesional" 
  - ✅ Límites compartidos: "21/50 clientes, 32/50 préstamos"
  - ✅ Si admin crea 20 clientes, quedan 30 para todos

### Problema actual:
- ❌ Admin ve: "Plan Profesional" pero límites "0/0"
- ❌ Cobrador ve: "Plan Gratuito" con límites "0/0"

---

## 📋 SCRIPTS A EJECUTAR (EN ORDEN)

Ve a **Supabase → SQL Editor** y ejecuta los siguientes scripts **en este orden exacto**:

### 1️⃣ PRIMERO: Fix Completo de Límites
```
supabase/FIX_COMPLETO_LIMITES_FINAL.sql
```

**Lo que hace este script:**
- ✅ Asigna `plan_id` a las organizaciones que no tienen
- ✅ Busca el plan del admin y lo asigna a la organización
- ✅ Limpia `plan_id` de usuarios individuales
- ✅ Crea organizaciones para usuarios sin org
- ✅ Verifica que todo esté configurado correctamente

**Resultado esperado:**
```
✅ FIX COMPLETADO
✅ Todas las organizaciones tienen plan
✅ Todos los usuarios tienen organización
```

---

### 2️⃣ SEGUNDO: Diagnóstico (Verificación)
```
supabase/DIAGNOSTICO_LIMITES_ORGANIZACION.sql
```

**Lo que hace este script:**
- 📊 Muestra tu organización y su plan
- 📊 Muestra todos tus usuarios
- 📊 Cuenta clientes y préstamos reales
- 📊 Ejecuta `get_limites_organizacion()` para verificar

**Resultado esperado:**
```sql
-- Tu organización:
nombre_negocio | plan          | limite_clientes | limite_prestamos
--------------+---------------+-----------------+------------------
Henry's Org    | Plan Profesional | 50          | 50

-- Resultado de get_limites_organizacion():
plan_nombre       | clientes_usados | prestamos_usados | limite_clientes | limite_prestamos
------------------+-----------------+------------------+----------------+-----------------
Plan Profesional  | 21              | 32               | 50             | 50
```

---

## 🔍 VERIFICACIÓN EN EL DASHBOARD

Después de ejecutar los scripts:

1. **Refresca tu navegador** (Ctrl+F5 o Cmd+Shift+R)
2. **Ve al Dashboard**
3. **Verifica que ahora veas:**

### Como Admin:
```
Plan Actual: Profesional
Clientes: 21/50 (barra de progreso al 42%)
Préstamos: 32/50 (barra de progreso al 64%)
```

### Como Cobrador (valeria):
```
Plan Actual: Profesional  ← Ya no "Gratuito"
Clientes: 21/50           ← Mismo que el admin
Préstamos: 32/50          ← Mismo que el admin
```

---

## ⚠️ SI AÚN HAY PROBLEMAS

Si después de ejecutar los scripts **aún ves "0/0"**, ejecuta esto en Supabase SQL Editor (autenticado como tu usuario):

```sql
-- Ver qué retorna la función
SELECT * FROM get_limites_organizacion();

-- Si retorna NULL o error, ver tu organización
SELECT 
  p.email,
  p.organization_id,
  o.nombre_negocio,
  o.plan_id,
  pl.nombre as plan
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN planes pl ON pl.id = o.plan_id
WHERE p.id = auth.uid();
```

**Comparte el resultado** y te ayudaré a diagnosticar.

---

## 🎯 RESUMEN DE LO QUE ARREGLAMOS

### Problema Original:
El script `FIX_ORGANIZACIONES_PLAN_COMPARTIDO.sql` limpió correctamente los `plan_id` de usuarios individuales, pero **NO asignó** el `plan_id` a las organizaciones.

### Solución:
El script `FIX_COMPLETO_LIMITES_FINAL.sql`:
1. Encuentra el plan del admin
2. Lo asigna a la organización (`organizations.plan_id`)
3. Limpia planes individuales de usuarios
4. Verifica que `get_limites_organizacion()` funcione

### Resultado:
- ✅ Organización tiene `plan_id` → "Plan Profesional"
- ✅ Usuarios tienen `plan_id = NULL` → Usan plan de la org
- ✅ `get_limites_organizacion()` retorna límites correctos
- ✅ Dashboard muestra "Plan Profesional 21/50 clientes, 32/50 préstamos"

---

## 📞 Si necesitas ayuda:

1. Ejecuta `DIAGNOSTICO_LIMITES_ORGANIZACION.sql`
2. Toma screenshot del resultado
3. Comparte el resultado y te ayudo a corregir

---

**¡Ejecuta los scripts ahora y verifica que todo funcione!** 🚀
