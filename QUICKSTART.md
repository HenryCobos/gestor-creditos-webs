# Guía de Inicio Rápido - Gestor de Créditos Web

## 🚀 Inicio Rápido (5 minutos)

### 1. Clonar e Instalar

```bash
# Si aún no lo has hecho, navega al directorio
cd gestor-creditos-webs

# Instalar dependencias
npm install
```

### 2. Configurar Supabase (2 minutos)

1. Ve a [supabase.com](https://supabase.com) → Nuevo proyecto
2. Nombre: `gestor-creditos`
3. Contraseña de base de datos: (guárdala segura)
4. Región: más cercana a ti
5. Espera 2-3 minutos
6. Ve a **SQL Editor** → Nueva consulta
7. Copia y pega TODO el contenido de `supabase/schema.sql`
8. Click en **Run**
9. Ve a **Settings** → **API** y copia las keys

### 3. Configurar Variables de Entorno

Crea `.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe - Puedes usar claves de prueba inicialmente
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx
```

### 4. Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 5. Primera Prueba

1. Click en "Regístrate aquí"
2. Completa el formulario
3. Revisa tu email para confirmar (opcional en desarrollo)
4. Inicia sesión
5. Serás redirigido a la página de suscripción
6. Por ahora, **temporalmente desactiva** la verificación de suscripción:
   - Abre `middleware.ts`
   - Comenta las líneas 27-32 (verificación de suscripción)
   - Guarda y recarga

### 6. Crear Primer Cliente

1. Navega a **Clientes**
2. Click en **Nuevo Cliente**
3. Completa:
   - Nombre: Juan Pérez
   - DNI: 12345678
   - Teléfono: 555-1234
   - Dirección: Calle Principal 123
4. Click en **Crear**

### 7. Crear Primer Préstamo

1. Navega a **Préstamos**
2. Click en **Nuevo Préstamo**
3. Completa:
   - Cliente: Juan Pérez
   - Monto: 10000
   - Interés: 10%
   - Cuotas: 12
   - Fecha: hoy
4. Observa el resumen calculado automáticamente
5. Click en **Crear Préstamo**

### 8. Registrar Primer Pago

1. Navega a **Cuotas**
2. Verás las 12 cuotas generadas automáticamente
3. Click en **Registrar Pago** en la primera cuota
4. El monto estará pre-llenado
5. Opcional: agrega método y notas
6. Click en **Registrar Pago**
7. La cuota se marcará como pagada

### 9. Ver Dashboard

1. Navega a **Dashboard**
2. Verás las métricas actualizadas:
   - 1 préstamo activo
   - $10,000 prestados
   - Monto recuperado
   - 11 cuotas pendientes

### 10. Ver Reportes

1. Navega a **Reportes**
2. Pestaña **Reporte General**: métricas completas
3. Pestaña **Reporte por Cliente**: selecciona Juan Pérez

## 🎯 Configurar Stripe (Producción)

### Modo de Prueba (Desarrollo)

1. Ve a [stripe.com](https://stripe.com) → Crea cuenta
2. Activa el modo de prueba (toggle arriba a la derecha)
3. Ve a **Developers** → **API keys**
4. Copia las keys de prueba
5. Ve a **Products** → **Add product**
   - Nombre: Plan Mensual Gestor
   - Precio: $29.99
   - Recurrente: Mensual
6. Copia el **Price ID**
7. Actualiza `.env.local` con las keys

### Webhook Local (Desarrollo)

```bash
# Instala Stripe CLI
npm install -g stripe

# O con Homebrew (Mac)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Reenviar webhooks a local
stripe listen --forward-to localhost:3000/api/webhook
```

Copia el webhook secret mostrado y actualiza `STRIPE_WEBHOOK_SECRET`

### Probar Suscripción

1. Descomenta las líneas en `middleware.ts`
2. Reinicia el servidor
3. Navega a **Subscription**
4. Click en **Suscribirse Ahora**
5. Usa tarjeta de prueba: `4242 4242 4242 4242`
6. Cualquier fecha futura y CVC
7. Completa el pago
8. Deberías ser redirigido al dashboard

## 📝 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Ejecutar build de producción
npm start

# Lint
npm run lint

# Stripe webhook local
stripe listen --forward-to localhost:3000/api/webhook
```

## 🐛 Solución Rápida de Problemas

### No puedo registrarme
- Verifica que las credenciales de Supabase estén correctas
- Revisa la consola del navegador
- Verifica que el schema SQL se ejecutó correctamente

### Las cuotas no se generan
- Verifica que el préstamo se creó correctamente
- Revisa la consola del navegador para errores
- Verifica las políticas RLS en Supabase

### El webhook de Stripe falla
- Verifica que Stripe CLI esté corriendo
- Verifica que el webhook secret esté correcto
- Revisa los logs de Stripe Dashboard

### No veo las métricas
- Verifica que haya datos (clientes, préstamos, cuotas)
- Refresca la página
- Revisa la consola del navegador

## 📚 Siguiente Paso

Lee el archivo `DEPLOYMENT.md` para aprender a desplegar en producción.

## 💡 Consejos

1. Mantén las credenciales seguras
2. No commits el archivo `.env.local`
3. Usa tarjetas de prueba de Stripe en desarrollo
4. Revisa los logs regularmente
5. Haz backups de Supabase periódicamente

## 🎉 ¡Listo!

Ahora tienes un sistema completo de gestión de créditos funcionando. 

**Próximos pasos sugeridos:**
1. Personalizar los estilos y colores
2. Agregar tu logo
3. Configurar el dominio personalizado
4. Activar Stripe en modo producción
5. Comenzar a usar en tu negocio

---

¿Preguntas? Revisa el `README.md` para más información.

