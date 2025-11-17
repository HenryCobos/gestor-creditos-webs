# Guía de Despliegue - Gestor de Créditos Web

## Paso 1: Configurar Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que el proyecto esté listo (2-3 minutos)
4. Ve a **Settings** > **API** y copia:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

5. Ve a **SQL Editor** y ejecuta el archivo `supabase/schema.sql`
6. Verifica que las tablas se hayan creado correctamente en **Table Editor**

### Habilitar Email Auth

1. Ve a **Authentication** > **Providers**
2. Asegúrate de que **Email** esté habilitado
3. Configura las URLs de redirección si es necesario

## Paso 2: Configurar Stripe

1. Ve a [https://stripe.com](https://stripe.com) y crea una cuenta
2. Completa la verificación de tu negocio
3. Ve a **Developers** > **API keys** y copia:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

### Crear Producto y Precio

1. Ve a **Products** > **Add product**
2. Nombre: "Gestor de Créditos - Plan Mensual"
3. Precio: $29.99 USD (o tu precio preferido)
4. Billing period: Monthly
5. Guarda y copia el **Price ID** → `STRIPE_PRICE_ID`

### Configurar Webhook (Temporal en desarrollo)

Para desarrollo local con Stripe CLI:

```bash
# Instalar Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Login
stripe login

# Escuchar webhooks localmente
stripe listen --forward-to localhost:3000/api/webhook
```

Copia el webhook secret que se muestra → `STRIPE_WEBHOOK_SECRET`

## Paso 3: Configurar Variables de Entorno Local

1. Copia el archivo `.env.example` a `.env.local`
2. Reemplaza todos los valores con tus credenciales reales

## Paso 4: Probar Localmente

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Prueba:
1. Registrarse
2. Iniciar sesión
3. Intentar acceder al dashboard (te debe redirigir a suscripción)
4. Usar tarjeta de prueba de Stripe: `4242 4242 4242 4242`
5. Verificar que puedes acceder al dashboard después de suscribirte

## Paso 5: Desplegar en Vercel

### A. Sube el código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/gestor-creditos-web.git
git push -u origin main
```

### B. Importar en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Click en **New Project**
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno:
   - Copia todas las variables de tu `.env.local`
   - **IMPORTANTE:** Cambia `NEXT_PUBLIC_APP_URL` a tu URL de producción
   - Ejemplo: `https://tu-proyecto.vercel.app`

5. Click en **Deploy**

### C. Configurar Webhook de Stripe en Producción

1. Ve a **Stripe Dashboard** > **Developers** > **Webhooks**
2. Click en **Add endpoint**
3. URL: `https://tu-proyecto.vercel.app/api/webhook`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copia el **Signing secret**
6. Ve a Vercel > Settings > Environment Variables
7. Actualiza `STRIPE_WEBHOOK_SECRET` con el nuevo valor
8. Redeploy el proyecto

## Paso 6: Configurar Dominio Personalizado (Opcional)

1. Ve a Vercel > Settings > Domains
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones
4. Actualiza `NEXT_PUBLIC_APP_URL` en las variables de entorno
5. Actualiza la URL del webhook en Stripe

## Paso 7: Configuración de Producción en Supabase

1. Ve a **Authentication** > **URL Configuration**
2. Agrega tu dominio de producción a **Site URL**
3. Agrega las redirect URLs necesarias:
   - `https://tu-dominio.com/**`
   - `https://tu-dominio.vercel.app/**`

## Paso 8: Pruebas en Producción

1. Registra un usuario de prueba
2. Verifica el flujo de suscripción
3. Crea un cliente, préstamo y registra un pago
4. Verifica que las métricas se actualicen correctamente
5. Prueba el flujo completo de cancelación de suscripción

## Paso 9: Activar Modo Live en Stripe

1. Completa la activación de tu cuenta en Stripe
2. Cambia de Test mode a Live mode
3. Crea un nuevo producto en modo live
4. Actualiza las API keys en Vercel con las keys de producción
5. Actualiza el webhook con la URL de producción

## 🔐 Checklist de Seguridad

- [ ] Variables de entorno configuradas correctamente
- [ ] RLS habilitado en todas las tablas de Supabase
- [ ] Webhook de Stripe verificado con signature
- [ ] HTTPS habilitado (automático con Vercel)
- [ ] Política de CORS configurada
- [ ] Rate limiting considerado (usar Vercel Edge Config si es necesario)

## 📊 Monitoreo

### Vercel
- Dashboard > Analytics
- Logs en tiempo real
- Performance metrics

### Supabase
- Database > Logs
- Authentication > Users
- API > Logs

### Stripe
- Dashboard > Events
- Logs > Webhooks
- Payments > All payments

## 🆘 Solución de Problemas

### Error: "No subscription found"
- Verifica que el webhook de Stripe esté configurado correctamente
- Revisa los logs del webhook en Stripe Dashboard
- Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto

### Error: "Unauthorized"
- Verifica las credenciales de Supabase
- Verifica que RLS esté configurado correctamente
- Verifica que el usuario esté autenticado

### Error en la base de datos
- Verifica que el schema SQL se haya ejecutado completamente
- Revisa los logs en Supabase
- Verifica las políticas RLS

## 📞 Soporte

Si encuentras problemas, revisa:
1. Logs de Vercel
2. Logs de Supabase
3. Logs de webhooks en Stripe
4. Console del navegador

---

¡Tu aplicación está lista para producción! 🚀

