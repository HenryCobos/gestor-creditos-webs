# 🎯 SOLUCIÓN DEFINITIVA - PROBLEMA IDENTIFICADO

**Fecha**: 11 Feb 2026  
**Problema**: Valeria (cobrador) ve "Plan Gratuito", Admin ve límites 0/0

---

## 🔍 PROBLEMA REAL IDENTIFICADO:

**Valeria NO está en la misma organización que Henry (admin).**

### Lo que encontré:

| Usuario | Organización | Plan |
|---------|-------------|------|
| Henry (admin) | "Henry" | **Profesional** ✅ |
| Valeria (cobrador) | "Otra org" | **Gratuito** ❌ |
| Otros usuarios | "Otras orgs" | **Gratuito** ❌ |

**Por eso:**
- ❌ Admin ve Plan Profesional pero límites 0/0 (porque Valeria no está en su org)
- ❌ Cobrador ve Plan Gratuito (porque está en una org diferente)

---

## ✅ SOLUCIÓN:

**Mover a TODOS los usuarios a la organización de Henry.**

---

## 📋 EJECUTA ESTE SCRIPT:

Ve a **Supabase → SQL Editor** y ejecuta:

```
supabase/MOVER_USUARIOS_A_ORG_HENRY.sql
```

Este script:
1. ✅ Identifica la organización de Henry (la que tiene "Plan Profesional")
2. ✅ Mueve a TODOS los usuarios a esa organización
3. ✅ Asigna roles correctos:
   - Henry = admin
   - Valeria y otros = cobradores
4. ✅ Verifica que todo quedó correcto

---

## 🎯 RESULTADO ESPERADO:

Después de ejecutar el script verás:

```
USUARIOS DESPUÉS DEL CAMBIO:
email                  | organizacion | role      | plan_organizacion | limite_clientes | limite_prestamos
-----------------------|--------------|-----------|-------------------|-----------------|------------------
hcobos99@gmail.com     | Henry        | admin     | Profesional       | 50              | 50
valeria@...            | Henry        | cobrador  | Profesional       | 50              | 50
otros@...              | Henry        | cobrador  | Profesional       | 50              | 50

USUARIOS POR ORGANIZACIÓN:
nombre_negocio | plan         | total_usuarios | admins | cobradores
---------------|--------------|----------------|--------|------------
Henry          | Profesional  | 10             | 1      | 9

ORGANIZACIONES VACÍAS:
(deben aparecer las otras 3 orgs con Plan Gratuito, ahora vacías)
```

---

## 🚀 VERIFICACIÓN EN EL DASHBOARD:

Después de ejecutar el script:

1. **Refresca tu navegador** (Ctrl+F5)
2. **Ve al Dashboard**

### Como Admin (Henry):
```
Plan Actual: Profesional
Clientes: 21/50 (42% usado)
Préstamos: 32/50 (64% usado)
```

### Como Cobrador (Valeria):
```
Plan Actual: Profesional  ✅ Ya no "Gratuito"
Clientes: 21/50           ✅ Mismo que admin
Préstamos: 32/50          ✅ Mismo que admin
```

---

## ⚠️ IMPORTANTE:

Si tu email NO es `hcobos99@gmail.com`, **EDITA EL SCRIPT** antes de ejecutar:

En la línea 19 del script, cambia:
```sql
v_henry_email TEXT := 'hcobos99@gmail.com'; -- 🔴 CAMBIA ESTO
```

Por tu email real.

---

## ✅ ESTO RESOLVERÁ:

1. ✅ Admin y cobradores verán el **mismo plan**
2. ✅ Admin y cobradores verán los **mismos límites**
3. ✅ El conteo de clientes/préstamos será **correcto**
4. ✅ Todos trabajarán en la **misma organización**

---

**¡Ejecuta el script y avísame cómo va!** 🚀
