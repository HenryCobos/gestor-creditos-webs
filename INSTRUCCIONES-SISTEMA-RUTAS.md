# 📋 INSTRUCCIONES: Sistema de Roles, Rutas y Cobradores

## 🎯 RESUMEN DEL SISTEMA

Has implementado exitosamente un **sistema completo de gestión multiusuario** con roles, rutas de cobro y control financiero para tu aplicación de gestión de créditos.

### ✅ **Características Implementadas:**

1. **👥 Sistema de Roles**: Administradores y Cobradores con permisos diferenciados
2. **🗺️ Rutas de Cobro**: Agrupación de clientes por cobrador con capital asignado
3. **💰 Gestión de Capital**: Control de dinero por ruta (ingresar, retirar, transferir)
4. **💸 Gastos Operativos**: Registro de gastos diarios (gasolina, comida, mantenimiento)
5. **🧮 Arqueos de Caja**: Comparación diaria de dinero esperado vs. real
6. **🔐 Seguridad RLS**: Row Level Security para proteger datos por organización y rol

---

## 🚀 PASO 1: EJECUTAR SCRIPTS SQL EN SUPABASE

### **1.1. Acceder al SQL Editor de Supabase**

1. Ve a tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New Query"**

### **1.2. Ejecutar el Script Principal**

**Archivo:** `supabase/migrations/add_roles_rutas_sistema.sql`

1. Abre el archivo en tu editor
2. **Copia TODO el contenido** (son ~870 líneas)
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** (▶️ botón verde)
5. **Espera** a que termine (puede tardar 30-60 segundos)

**✅ Deberías ver:** "Success. No rows returned"

### **1.3. Ejecutar el Script de Migración de Usuarios**

**Archivo:** `supabase/migrations/migrate_existing_users_to_organizations.sql`

1. Abre el archivo
2. **Copia TODO el contenido** (son ~178 líneas)
3. Pégalo en una **nueva query** en el SQL Editor
4. Haz clic en **"Run"** (▶️)
5. **Espera** a que termine

**✅ Deberías ver en los logs:**
```
NOTICE:  ========================================
NOTICE:  REPORTE DE MIGRACIÓN
NOTICE:  ========================================
NOTICE:  Total usuarios activos: X
NOTICE:  Usuarios migrados: X
NOTICE:  Organizaciones creadas: X
NOTICE:  ========================================
NOTICE:  ✅ Migración exitosa: Todos los usuarios fueron migrados
```

---

## 🔍 PASO 2: VERIFICAR QUE TODO FUNCIONA

### **2.1. Verificar Tablas Creadas**

En el SQL Editor, ejecuta:

```sql
-- Ver todas las tablas nuevas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'organizations', 
    'user_roles', 
    'rutas', 
    'ruta_clientes',
    'movimientos_capital_ruta',
    'gastos',
    'arqueos_caja'
  );
```

**✅ Deberías ver:** 7 filas (las 7 tablas)

### **2.2. Verificar Usuarios Migrados**

```sql
-- Ver usuarios con sus roles
SELECT * FROM v_users_with_roles;
```

**✅ Deberías ver:** Todos tus usuarios existentes con:
- `role_assigned` = 'admin'
- `is_owner` = true
- Una `organization_id` asignada

### **2.3. Verificar en la Aplicación**

1. **Inicia sesión** con tu usuario
2. Deberías ver **nuevas opciones en el menú** lateral:
   - Usuarios
   - Rutas
   - Gastos
   - Arqueos (Caja)
3. Tu menú debería tener separadores visuales

---

## 👤 PASO 3: CREAR TU PRIMER COBRADOR

### **3.1. Ir a Gestión de Usuarios**

1. En el menú lateral, haz clic en **"Usuarios"**
2. Haz clic en **"Nuevo Usuario"** (botón azul arriba a la derecha)

### **3.2. Llenar el Formulario**

- **Email**: `cobrador@ejemplo.com` (correo del cobrador)
- **Contraseña**: `123456` (mínimo 6 caracteres)
- **Nombre Completo**: `Juan Pérez` (nombre del cobrador)
- **Rol**: Selecciona **"Cobrador (Acceso limitado a sus rutas)"**

### **3.3. Crear Usuario**

- Haz clic en **"Crear Usuario"**
- **✅ Deberías ver:** Mensaje de éxito "Cobrador creado correctamente"
- El cobrador aparecerá en la tabla con badge "👤 Cobrador"

---

## 🗺️ PASO 4: CREAR TU PRIMERA RUTA

### **4.1. Ir a Gestión de Rutas**

1. En el menú lateral, haz clic en **"Rutas"**
2. Haz clic en **"Nueva Ruta"** (botón azul)

### **4.2. Llenar el Formulario**

- **Nombre de la Ruta**: `Ruta Centro` (o el nombre que prefieras)
- **Cobrador Asignado**: Selecciona el cobrador que creaste
- **Capital Inicial**: `5000.00` (monto en tu moneda)
- **Descripción** (opcional): `Zona céntrica de la ciudad`
- **Color Identificador**: Elige un color (o deja el azul por defecto)

### **4.3. Crear Ruta**

- Haz clic en **"Crear Ruta"**
- **✅ Deberías ver:** 
  - Mensaje de éxito
  - Card de la ruta mostrando:
    - Capital disponible: $5,000.00
    - 0 clientes
    - 0 préstamos activos

---

## 👥 PASO 5: ASIGNAR CLIENTES A LA RUTA

### **5.1. En la Card de la Ruta**

1. Haz clic en el botón **"Clientes"** (en la card de la ruta)
2. Se abrirá un diálogo con **todos tus clientes existentes**

### **5.2. Seleccionar Clientes**

- Marca con checkbox los clientes que quieres asignar a esta ruta
- Ejemplo: Selecciona 5 clientes

### **5.3. Guardar Asignación**

- Haz clic en **"Guardar Asignación"**
- **✅ Deberías ver:** 
  - "5 cliente(s) asignado(s) a la ruta"
  - La card ahora muestra "5" en clientes

---

## 💸 PASO 6: REGISTRAR UN GASTO (COMO COBRADOR)

### **6.1. Cerrar Sesión e Iniciar como Cobrador**

1. Cierra sesión (botón "Cerrar Sesión" abajo en el menú)
2. Inicia sesión con el cobrador que creaste:
   - Email: `cobrador@ejemplo.com`
   - Contraseña: `123456`

### **6.2. Verificar Vista de Cobrador**

**✅ El menú debería ser DIFERENTE:**
- Mis Clientes (no "Clientes")
- Mis Préstamos (no "Préstamos")
- Mis Cuotas (no "Cuotas")
- **NO debería ver**: Usuarios, Rutas, Reportes, Productos

**✅ Solo debería ver**: Los 5 clientes que asignaste a su ruta

### **6.3. Registrar un Gasto**

1. Ir a **"Mis Gastos"**
2. Clic en **"Registrar Gasto"**
3. Llenar:
   - Categoría: **Gasolina** (icono de auto)
   - Monto: `50.00`
   - Fecha: Hoy
   - Ruta: Debería estar preseleccionada
   - Descripción: `Gasolina para recorrido del día`
4. Clic en **"Registrar Gasto"**

**✅ Deberías ver:**
- Mensaje de éxito
- El gasto aparece en la tabla con estado "Aprobado" (automático)

---

## 🧮 PASO 7: HACER UN ARQUEO DE CAJA

### **7.1. Ir a Mi Caja**

1. Como **cobrador**, ir a **"Mi Caja"**
2. Clic en **"Nuevo Arqueo"**

### **7.2. Calcular Dinero Esperado**

1. Seleccionar:
   - Ruta: (debería estar preseleccionada)
   - Fecha: Hoy
2. Clic en **"Calcular Dinero Esperado"**

**✅ Deberías ver:**
- Capital en Ruta: $5,000.00
- **Dinero Esperado: $5,000.00** (porque no hay préstamos ni pagos aún)

### **7.3. Reportar Dinero Real**

1. En **"Dinero Real (Contado)"**: Escribe `5000.00`
2. Diferencia: $0.00 (verde, todo cuadra)
3. Notas: `Todo correcto`
4. Clic en **"Registrar Arqueo"**

**✅ Deberías ver:**
- "Arqueo registrado - Estado: cuadrado"
- Badge verde con ✓ "Cuadrado"

---

## 💰 PASO 8: GESTIONAR CAPITAL (COMO ADMIN)

### **8.1. Volver como Admin**

1. Cierra sesión del cobrador
2. Inicia sesión con tu cuenta admin

### **8.2. Ingresar Capital a una Ruta**

1. Ir a **"Rutas"**
2. En la card de la ruta, clic en **"Capital"**
3. Seleccionar:
   - Tipo: **"Ingresar Capital"** (flecha verde arriba)
   - Monto: `1000.00`
   - Concepto: `Aumento de capital para más préstamos`
4. Clic en **"Confirmar Ingreso"**

**✅ Deberías ver:**
- Capital disponible actualizado: $6,000.00
- Historial de movimiento registrado

### **8.3. Transferir Capital Entre Rutas**

1. Crea una segunda ruta (si no tienes)
2. En la primera ruta, clic en **"Capital"**
3. Seleccionar:
   - Tipo: **"Transferir a Otra Ruta"** (flechas azules)
   - Ruta Destino: Selecciona la segunda ruta
   - Monto: `500.00`
   - Concepto: `Transferencia por necesidad operativa`
4. Clic en **"Confirmar Transferencia"**

**✅ Deberías ver:**
- Ruta origen: Capital disminuye $500
- Ruta destino: Capital aumenta $500
- 2 movimientos registrados (salida y entrada)

### **8.4. Ver Historial de Movimientos**

1. En cualquier ruta, clic en el icono de **reloj** (Historial)
2. **✅ Deberías ver:** Todos los movimientos con:
   - Tipo (ingreso, retiro, transferencia, préstamo, pago)
   - Monto con colores (verde +, rojo -)
   - Concepto
   - Usuario que lo realizó
   - Saldo anterior → Saldo nuevo

---

## 🎓 FLUJO COMPLETO: CREAR UN PRÉSTAMO CON RUTA

### **Paso 1: Admin Crea Préstamo Vinculado a Ruta**

1. Ir a **"Préstamos"**
2. Clic en **"Nuevo Préstamo"**
3. Llenar normalmente PERO:
   - **IMPORTANTE**: Seleccionar cliente que esté asignado a una ruta
4. El sistema **automáticamente**:
   - Detecta la ruta del cliente
   - Valida que hay capital suficiente
   - Descuenta el capital de la ruta
   - Registra movimiento de "préstamo_entregado"

### **Paso 2: Cobrador Registra Pago**

1. Como **cobrador**, ir a **"Mis Cuotas"**
2. Buscar cuota del préstamo
3. Registrar pago
4. El sistema **automáticamente**:
   - Suma el dinero a la ruta
   - Registra movimiento de "pago_recibido"
   - Actualiza capital disponible

---

## 🔐 PERMISOS Y RESTRICCIONES

### **👨‍💼 ADMIN puede:**

- ✅ Ver y gestionar todos los clientes
- ✅ Crear, editar, eliminar préstamos
- ✅ Crear cobradores y administradores
- ✅ Crear y gestionar rutas
- ✅ Asignar clientes a rutas
- ✅ Gestionar capital (ingresar, retirar, transferir)
- ✅ Ver y editar todos los gastos
- ✅ Ver todos los arqueos de caja
- ✅ Ver reportes completos

### **👤 COBRADOR puede:**

- ✅ Ver **solo** clientes de sus rutas asignadas
- ✅ Ver **solo** préstamos de sus clientes
- ✅ Ver **solo** cuotas de sus préstamos
- ✅ Registrar pagos de cuotas (solo de sus rutas)
- ✅ Editar cuotas **solo si las registró el mismo día**
- ✅ Registrar sus gastos diarios
- ✅ Ver sus gastos (no los de otros)
- ✅ Hacer arqueos de sus rutas
- ✅ Ver movimientos de capital de sus rutas
- ❌ NO puede crear/editar/eliminar clientes
- ❌ NO puede crear préstamos
- ❌ NO puede ver otras rutas
- ❌ NO puede gestionar capital
- ❌ NO puede ver gastos de otros cobradores

---

## 🛠️ SOLUCIÓN DE PROBLEMAS

### **❌ Error: "No se pudieron cargar los datos"**

**Causa:** RLS policies no están activas

**Solución:**
```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'user_roles', 'rutas', 'gastos', 'arqueos_caja');

-- Si alguna tiene rowsecurity = false, habilitar:
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
```

### **❌ Error: "Capital insuficiente en la ruta"**

**Causa:** Intentando crear préstamo mayor al capital disponible

**Solución:**
1. Ir a "Rutas"
2. Clic en "Capital" en la ruta
3. Seleccionar "Ingresar Capital"
4. Agregar más dinero

### **❌ Cobrador ve clientes de otras rutas**

**Causa:** Cliente no está correctamente asignado a una ruta

**Solución:**
1. Como admin, ir a "Rutas"
2. Clic en "Clientes" en la ruta del cobrador
3. Asignar correctamente los clientes

### **❌ Usuarios existentes no tienen rol**

**Causa:** Script de migración no se ejecutó

**Solución:**
1. Ejecutar nuevamente: `migrate_existing_users_to_organizations.sql`
2. O manualmente:
```sql
-- Verificar usuarios sin rol
SELECT * FROM v_users_with_roles WHERE role_assigned IS NULL;

-- Asignar rol admin manualmente (reemplaza USER_ID)
INSERT INTO user_roles (user_id, organization_id, role)
SELECT 
  'USER_ID_AQUI'::uuid,
  organization_id,
  'admin'
FROM profiles 
WHERE id = 'USER_ID_AQUI'::uuid;
```

---

## 📊 VERIFICAR ESTADO DEL SISTEMA

### **SQL útiles para debugging:**

```sql
-- 1. Ver todos los usuarios con sus roles
SELECT * FROM v_users_with_roles;

-- 2. Ver todas las rutas con capital
SELECT 
  r.nombre_ruta,
  r.capital_actual,
  p.nombre_completo as cobrador
FROM rutas r
LEFT JOIN profiles p ON p.id = r.cobrador_id
ORDER BY r.created_at DESC;

-- 3. Ver clientes por ruta
SELECT 
  r.nombre_ruta,
  COUNT(rc.id) as total_clientes
FROM rutas r
LEFT JOIN ruta_clientes rc ON rc.ruta_id = r.id AND rc.activo = true
GROUP BY r.id, r.nombre_ruta;

-- 4. Ver movimientos de capital del día
SELECT 
  r.nombre_ruta,
  mc.tipo_movimiento,
  mc.monto,
  mc.concepto,
  mc.fecha_movimiento
FROM movimientos_capital_ruta mc
JOIN rutas r ON r.id = mc.ruta_id
WHERE DATE(mc.fecha_movimiento) = CURRENT_DATE
ORDER BY mc.fecha_movimiento DESC;

-- 5. Ver gastos del día por cobrador
SELECT 
  p.nombre_completo as cobrador,
  g.categoria,
  g.monto,
  g.descripcion
FROM gastos g
JOIN profiles p ON p.id = g.cobrador_id
WHERE g.fecha_gasto = CURRENT_DATE
ORDER BY g.created_at DESC;
```

---

## 🎉 SIGUIENTES PASOS RECOMENDADOS

1. **Crear más rutas** para diferentes zonas geográficas
2. **Asignar todos tus clientes** existentes a rutas específicas
3. **Capacitar a los cobradores** sobre cómo usar el sistema
4. **Establecer política de arqueos diarios** obligatorios
5. **Revisar reportes semanales** de gastos y diferencias en caja

---

## 📞 SOPORTE

Si tienes problemas:

1. **Revisar logs de Supabase**: SQL Editor → Ver errores
2. **Revisar consola del navegador**: F12 → Console
3. **Verificar RLS**: Asegurarse que las policies están activas
4. **Probar con usuario admin primero**: Antes de probar con cobradores

---

## ✅ CHECKLIST FINAL

- [ ] Scripts SQL ejecutados correctamente
- [ ] Usuarios existentes migrados a admin
- [ ] Menú lateral muestra nuevas opciones
- [ ] Puedo crear cobradores
- [ ] Puedo crear rutas con capital
- [ ] Puedo asignar clientes a rutas
- [ ] Cobrador solo ve sus clientes
- [ ] Gastos se registran y aprueban automáticamente
- [ ] Arqueos calculan dinero esperado correctamente
- [ ] Capital se actualiza al crear préstamos/recibir pagos

---

## 🎯 ¡LISTO!

Tu sistema está completamente funcional. Ahora puedes:

- ✅ Gestionar múltiples cobradores
- ✅ Controlar capital por ruta
- ✅ Hacer seguimiento de gastos operativos
- ✅ Auditar arqueos de caja diarios
- ✅ Tener visibilidad completa del negocio

**¡Feliz gestión! 🚀**
