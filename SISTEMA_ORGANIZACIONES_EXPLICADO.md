# 📚 SISTEMA DE ORGANIZACIONES - EXPLICADO

## 🎯 CONCEPTO PRINCIPAL

**Una organización = Un cliente independiente**

Cada organización tiene:
- ✅ Un administrador (owner)
- ✅ Múltiples cobradores (opcional)
- ✅ UN plan compartido (no planes individuales)
- ✅ Límites compartidos entre todos sus usuarios

---

## 🔄 FLUJO DE CREACIÓN DE USUARIOS

### 1️⃣ Usuario desde Landing Page (Registro Público)

**¿Cómo funciona?**

```
Usuario registra → Trigger automático → Crea NUEVA organización → Usuario es admin de su org
```

**Detalles técnicos:**
- El trigger `handle_new_user_signup()` detecta nuevos usuarios sin `organization_id`
- Crea automáticamente una organización con plan gratuito
- Asigna al usuario como `admin` de esa organización
- Crea el registro en `user_roles`

**Resultado:**
- ✅ Usuario tiene su propia organización
- ✅ Rol: `admin`
- ✅ Plan: `free` (por defecto)

---

### 2️⃣ Usuario desde Dashboard (Creado por Admin)

**¿Cómo funciona?**

```
Admin crea cobrador → API asigna organization_id → Trigger detecta org existente → NO crea nueva org
```

**Detalles técnicos:**
- API route `/api/usuarios/crear` asigna `organization_id` del admin
- El profile se crea CON `organization_id` ya asignado
- El trigger `handle_new_user_signup()` detecta que ya tiene organización
- NO crea nueva organización (respeta la existente)
- Crea el registro en `user_roles` con la org del admin

**Resultado:**
- ✅ Usuario pertenece a la organización del admin
- ✅ Rol: `cobrador` (o el rol asignado)
- ✅ Plan: Comparte el plan de la organización

---

## 📊 PLANES Y LÍMITES

### Sistema de Límites Compartidos

```
Organización → Tiene 1 plan (ej: Plan Profesional 50/50)
    ↓
Admin + Cobradores → Comparten los mismos límites
    ↓
Clientes y Préstamos → Se cuentan a nivel organizacional
```

**Ejemplo:**

**Organización "Henry's Business"**
- Plan: Profesional (50 clientes, 50 préstamos)
- Admin: Henry
- Cobradores: Valeria, Juan, María

**Recursos:**
- Henry crea 15 clientes → Contador: 15/50
- Valeria crea 10 clientes → Contador: 25/50
- Juan crea 5 clientes → Contador: 30/50
- **TODOS ven: 30/50 clientes usados**

---

## 🔧 FUNCIONES CLAVE

### `get_limites_organizacion()`

**Qué hace:**
- Obtiene la organización del usuario actual (`auth.uid()`)
- Cuenta TODOS los clientes de la organización
- Cuenta TODOS los préstamos de la organización
- Retorna límites del plan y uso actual

**Retorna:**
```json
{
  "organization_id": "uuid",
  "plan_nombre": "Plan Profesional",
  "plan_slug": "pro",
  "limite_clientes": 50,
  "limite_prestamos": 50,
  "clientes_usados": 21,
  "prestamos_usados": 32,
  "clientes_disponibles": 29,
  "prestamos_disponibles": 18,
  "puede_crear_cliente": true,
  "puede_crear_prestamo": true
}
```

### `get_uso_por_usuario()`

**Qué hace:**
- Obtiene la organización del usuario actual
- Lista TODOS los usuarios de esa organización
- Muestra cuántos clientes/préstamos creó cada uno

**Retorna:**
```json
[
  {
    "user_id": "uuid",
    "email": "henry@example.com",
    "nombre_completo": "Henry",
    "role": "admin",
    "clientes_count": 15,
    "prestamos_count": 20
  },
  {
    "user_id": "uuid",
    "email": "valeria@example.com",
    "nombre_completo": "Valeria",
    "role": "cobrador",
    "clientes_count": 6,
    "prestamos_count": 12
  }
]
```

---

## 🔐 SEGURIDAD (RLS)

### Estrategia Actual

**Para INSERT/UPDATE/DELETE:**
- RLS simple: `USING (true)` o `user_id = auth.uid()`
- Validaciones de permisos en aplicación

**Para SELECT:**
- Funciones `SECURITY DEFINER` (get_limites_organizacion, get_uso_por_usuario)
- Filtran automáticamente por organización del usuario

---

## ❌ ERRORES COMUNES

### Error: "Plan Gratuito 0/0"

**Causa:** Usuario sin `organization_id` o con `plan_id` individual

**Solución:** Ejecutar `FIX_FINAL_MULTIPLES_ORGS.sql`

### Error: Usuario en organización incorrecta

**Causa:** Discrepancia entre `profiles.organization_id` y `user_roles.organization_id`

**Solución:** Ejecutar `FIX_FINAL_MULTIPLES_ORGS.sql`

### Error: Nuevos usuarios con plan individual

**Causa:** Trigger antiguo asignaba `plan_id` individual

**Solución:** Ejecutar `FIX_TRIGGER_USUARIOS_FINAL.sql` (si no se ha hecho)

---

## ✅ ESTADO IDEAL DEL SISTEMA

### Tabla `organizations`
- Cada organización tiene `plan_id` (nunca NULL)
- Cada organización tiene `owner_id`

### Tabla `profiles`
- Cada usuario tiene `organization_id` (nunca NULL)
- `plan_id` debe ser NULL (planes están en organizaciones, no en usuarios)
- `limite_clientes` y `limite_prestamos` deben ser NULL

### Tabla `user_roles`
- Cada usuario tiene un registro con `organization_id` y `role`
- Debe coincidir con `profiles.organization_id`

---

## 🚀 PRÓXIMOS PASOS

1. **Ejecutar** `FIX_FINAL_MULTIPLES_ORGS.sql` → Corrige asignaciones
2. **Limpiar caché** del navegador
3. **Cerrar sesión** y volver a iniciar
4. **Verificar** que todos vean el plan correcto

---

## 📞 SOPORTE

Si después de ejecutar los scripts aún hay problemas:
1. Ejecuta `VERIFICACION_ESTADO_ACTUAL.sql`
2. Toma screenshot de los resultados
3. Comparte los screenshots para diagnóstico profundo
