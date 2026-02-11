# 🎯 EJECUTAR SOLO ESTE SCRIPT

**Fecha**: 11 Feb 2026  
**Problema**: Admin ve límites 0/0, Cobrador ve "Plan Gratuito"  
**Solución**: Un solo script que hace TODO

---

## ⚠️ IMPORTANTE

**Ignora todos los scripts anteriores.** Solo ejecuta este:

---

## 📝 EJECUTA ESTE ÚNICO SCRIPT

Ve a **Supabase → SQL Editor** y ejecuta:

```
supabase/FIX_TODO_EN_UNO_FINAL.sql
```

---

## ✅ Qué hace este script:

1. **Crea organizaciones** para usuarios sin org
2. **Asigna `plan_id`** a organizaciones sin plan
3. **Limpia `plan_id`** de usuarios individuales (para que usen el de la org)
4. **Recrea la función** `get_limites_organizacion()` corregida
5. **Verifica** que todo esté correcto
6. **Prueba** la función automáticamente

---

## 🎯 Resultado Esperado

Al final del script verás:

```sql
-- ✅ Usuarios sin org: 0
-- ✅ Organizaciones sin plan: 0
-- ✅ Usuarios con plan individual en org: 0
-- ✅ Resultado de get_limites_organizacion():

plan_nombre       | plan_slug | limite_clientes | limite_prestamos | clientes_usados | prestamos_usados
------------------|-----------|-----------------|------------------|-----------------|------------------
Plan Profesional  | pro       | 50              | 50               | 21              | 32
```

---

## 🔍 Verificar en el Dashboard

Después de ejecutar el script:

1. **Refresca tu navegador** (Ctrl+F5 o Cmd+Shift+R)
2. **Ve al Dashboard**
3. **Verifica**:

### Como Admin:
```
Plan Actual: Profesional
Clientes: 21/50 (42% usado)
Préstamos: 32/50 (64% usado)
```

### Como Cobrador (valeria):
```
Plan Actual: Profesional  ← Ya no "Gratuito"
Clientes: 21/50           ← Mismo que admin
Préstamos: 32/50          ← Mismo que admin
```

---

## ⚠️ Si algo falla

Si el script da algún error:

1. **Copia el error completo**
2. **Toma screenshot del error**
3. **Compártelo** y te ayudaré inmediatamente

---

## 📌 Resumen

- ✅ **Solo 1 script** para ejecutar
- ✅ **Sin pasos adicionales** necesarios
- ✅ **Hace todo automáticamente**
- ✅ **Se auto-verifica**

**¡Ejecuta el script y listo!** 🚀
