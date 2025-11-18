# 🔧 Solución: Error al Registrar Nuevos Usuarios

## 🚨 Problema

Error al intentar crear una nueva cuenta:
```
Database error saving new user
```

---

## ✅ Solución Rápida (3 pasos)

### **PASO 1: Abrir Supabase**

1. Ve a: https://supabase.com
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto de GestorPro
4. Click en **"SQL Editor"** en el menú lateral

### **PASO 2: Ejecutar el Script de Solución**

1. **Abre el archivo** `supabase/fix-registro-usuarios.sql` en tu editor
2. **Copia TODO el contenido** del archivo
3. **Pega** el script en el SQL Editor de Supabase
4. **Click en "Run"** o **"Execute"** (botón en la esquina superior derecha)

**Deberías ver:**
- ✅ "Success. No rows returned" o mensajes de éxito
- ✅ Una tabla con usuarios y sus planes (query de verificación)
- ✅ Confirmación de que el trigger existe

### **PASO 3: Probar el Registro**

1. Ve a tu aplicación: `https://gestor-creditos-webs.vercel.app/register`
2. Intenta registrar un nuevo usuario
3. ✅ **Debería funcionar sin errores**

---

## 🎯 Lo que hace el Script

### Corrige 3 Problemas:

1. **Crea/actualiza el trigger** que genera automáticamente el perfil del usuario
2. **Corrige usuarios existentes** que no tienen perfil
3. **Asigna el plan gratuito** automáticamente a nuevos registros

### Función Principal:

```sql
handle_new_user()
```

Esta función se ejecuta automáticamente cada vez que un usuario se registra y:
- ✅ Crea el perfil en la tabla `profiles`
- ✅ Asigna el plan gratuito automáticamente
- ✅ Establece el estado de suscripción como 'active'

---

## 📝 Cambios Realizados en el Código

### **1. Página de Registro Mejorada** (`app/register/page.tsx`)

**Cambios:**
- ✅ Mejor manejo de errores
- ✅ Mensajes más claros para el usuario
- ✅ Log de errores en consola para debugging
- ✅ Redirección automática después del registro

### **2. Sistema de Recuperación de Contraseña** (NUEVO)

**3 Páginas Nuevas:**

#### **A) Recuperar Contraseña** (`/recuperar-contrasena`)
- ✅ Solicitar email para reset
- ✅ Envío de email con link de recuperación
- ✅ Instrucciones claras para el usuario

#### **B) Actualizar Contraseña** (`/actualizar-contrasena`)
- ✅ Formulario para nueva contraseña
- ✅ Confirmación de contraseña
- ✅ Validaciones de seguridad

#### **C) Link en Login** 
- ✅ "¿Olvidaste tu contraseña?" en la página de login
- ✅ Diseño profesional y visible

---

## 🧪 Probar que Todo Funciona

### **Prueba 1: Registro de Nuevo Usuario**

1. Ir a: `https://gestor-creditos-webs.vercel.app/register`
2. Llenar el formulario:
   - Nombre: "Usuario Prueba"
   - Email: "prueba@ejemplo.com"
   - Contraseña: "123456"
3. Click en "Crear Cuenta"
4. ✅ **Debe mostrar:** "¡Registro exitoso!"
5. ✅ **Debe redirigir** al login automáticamente

### **Prueba 2: Login con Usuario Nuevo**

1. Ir a: `https://gestor-creditos-webs.vercel.app/login`
2. Ingresar email y contraseña del usuario creado
3. Click en "Iniciar Sesión"
4. ✅ **Debe entrar** al dashboard sin errores
5. ✅ **Debe tener** el Plan Gratuito activo

### **Prueba 3: Recuperación de Contraseña**

1. Ir a: `https://gestor-creditos-webs.vercel.app/login`
2. Click en "¿Olvidaste tu contraseña?"
3. Ingresar email de un usuario existente
4. Click en "Enviar Link de Recuperación"
5. ✅ **Debe mostrar:** "Email enviado"
6. Revisar bandeja de entrada
7. ✅ **Debe llegar** email con link de recuperación
8. Click en el link del email
9. ✅ **Debe abrir** página de "Nueva Contraseña"
10. Ingresar nueva contraseña y confirmar
11. ✅ **Debe actualizar** y redirigir al dashboard

---

## ⚠️ Configuración de Email en Supabase

Para que la recuperación de contraseña funcione correctamente:

### **Verificar Configuración de Email:**

1. En Supabase, ve a **Authentication** → **Email Templates**
2. Verifica que estén configurados:
   - ✅ **Reset Password Template** (para recuperación)
   - ✅ **Confirm Signup Template** (para registro)

### **Desactivar Confirmación de Email (Opcional - para desarrollo):**

Si quieres que los usuarios puedan hacer login inmediatamente sin confirmar email:

1. Ve a **Authentication** → **Settings**
2. Busca **"Email Confirmations"**
3. **Desactiva** "Enable email confirmations"
4. Click en "Save"

**Nota:** En producción, es recomendable mantener la confirmación de email activada.

---

## 🐛 Solución de Problemas

### **Error: "User already registered"**

**Solución:**
- El email ya está en uso
- Intenta con otro email o haz login con el existente

### **Error: "Invalid login credentials"**

**Solución:**
1. Verifica que el email y contraseña sean correctos
2. Si olvidaste la contraseña, usa "Recuperar Contraseña"

### **No llega el email de recuperación**

**Soluciones:**
1. Revisa la carpeta de spam
2. Verifica que el email esté correcto
3. Espera 2-3 minutos (puede tardar)
4. Verifica configuración de email en Supabase

### **Error: "Database error" al registrar**

**Solución:**
1. Ejecuta de nuevo el script `supabase/fix-registro-usuarios.sql`
2. Verifica que la tabla `planes` tenga un plan con `slug = 'free'`
3. Ejecuta este query en Supabase para verificar:
```sql
SELECT * FROM planes WHERE slug = 'free';
```

---

## 📊 Verificar Estado en Supabase

### **Ver Todos los Usuarios:**

```sql
SELECT 
  p.email, 
  p.full_name,
  pl.nombre as plan_nombre,
  p.subscription_status,
  p.created_at
FROM profiles p
LEFT JOIN planes pl ON p.plan_id = pl.id
ORDER BY p.created_at DESC;
```

### **Ver Usuarios sin Perfil (debe estar vacío):**

```sql
SELECT au.email, au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

### **Verificar Trigger:**

```sql
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

---

## ✅ Checklist Final

- [ ] Script `fix-registro-usuarios.sql` ejecutado en Supabase
- [ ] Trigger `on_auth_user_created` existe (verificado con query)
- [ ] Todos los usuarios tienen perfil en tabla `profiles`
- [ ] Todos los perfiles tienen `plan_id` asignado
- [ ] Prueba de registro exitosa (nuevo usuario creado)
- [ ] Prueba de login exitosa con usuario nuevo
- [ ] Prueba de recuperación de contraseña exitosa
- [ ] Email de recuperación llegando correctamente

---

## 🎉 Resultado Esperado

Después de ejecutar el script:

✅ **Registro de Usuarios:** Funciona perfectamente
✅ **Login:** Funciona sin errores
✅ **Recuperación de Contraseña:** Sistema completo funcionando
✅ **Plan Gratuito:** Asignado automáticamente a nuevos usuarios
✅ **Dashboard:** Usuarios pueden acceder sin problemas

---

## 🆘 Si Todavía Tienes Problemas

1. **Revisa la consola del navegador** (F12) para ver errores específicos
2. **Revisa los logs de Supabase** en Authentication → Users
3. **Verifica que las variables de entorno** estén correctas en Vercel
4. **Contacta** si el problema persiste con los detalles del error

---

¿Listo para ejecutar el script? Sigue los 3 pasos de arriba y tu sistema de registro estará funcionando! 🚀

