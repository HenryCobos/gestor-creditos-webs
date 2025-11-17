<<<<<<< HEAD
# Gestor de Créditos Web - SaaS

Sistema profesional de gestión de préstamos, clientes y cuotas con suscripción mensual.

## 🚀 Características

- ✅ Autenticación segura con Supabase Auth
- ✅ Gestión completa de clientes (CRUD)
- ✅ Creación y gestión de préstamos con cálculo automático de intereses
- ✅ Sistema de cuotas con pagos parciales y totales
- ✅ Dashboard con métricas en tiempo real
- ✅ Módulo de reportes general y por cliente
- ✅ Sistema de suscripción con Stripe
- ✅ Alertas de cuotas retrasadas
- ✅ UI moderna y responsiva con Tailwind CSS y shadcn/ui

## 📋 Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** TailwindCSS + shadcn/ui
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Pagos:** Stripe
- **Estado Global:** Zustand
- **Despliegue:** Vercel

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=tu-stripe-publishable-key
STRIPE_SECRET_KEY=tu-stripe-secret-key
STRIPE_WEBHOOK_SECRET=tu-stripe-webhook-secret
STRIPE_PRICE_ID=tu-price-id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el SQL del archivo `supabase/schema.sql` en el SQL Editor de Supabase
3. Copia las credenciales al archivo `.env.local`

### 4. Configurar Stripe

1. Crea una cuenta en [Stripe](https://stripe.com)
2. Crea un producto con precio recurrente mensual
3. Configura el webhook apuntando a: `https://tu-dominio.com/api/webhook`
4. Eventos del webhook a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copia las credenciales al archivo `.env.local`

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Despliegue en Vercel

### Opción 1: Desde GitHub

1. Sube tu código a GitHub
2. Importa el proyecto en [Vercel](https://vercel.com)
3. Configura las variables de entorno en Vercel
4. Despliega

### Opción 2: CLI de Vercel

```bash
npm i -g vercel
vercel login
vercel
```

### Configurar el Webhook de Stripe en Producción

Después del despliegue, actualiza la URL del webhook en Stripe:

```
https://tu-dominio.vercel.app/api/webhook
```

## 📁 Estructura del Proyecto

```
gestor-creditos-web/
├── app/
│   ├── api/                    # API Routes
│   │   ├── create-checkout-session/
│   │   ├── create-portal-session/
│   │   └── webhook/
│   ├── dashboard/              # Páginas del dashboard
│   │   ├── clientes/
│   │   ├── prestamos/
│   │   ├── cuotas/
│   │   ├── reportes/
│   │   ├── subscription/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── login/
│   ├── register/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── ui/                     # Componentes de shadcn/ui
├── lib/
│   ├── supabase/              # Clientes de Supabase
│   ├── store.ts               # Estado global (Zustand)
│   ├── stripe.ts              # Configuración de Stripe
│   └── utils.ts               # Utilidades
├── supabase/
│   └── schema.sql             # Esquema de base de datos
├── middleware.ts              # Middleware de autenticación
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🎯 Características Principales

### Dashboard
- Métricas en tiempo real
- Préstamos activos, recuperados y pendientes
- Ganancia por intereses
- Alertas de cuotas retrasadas

### Gestión de Clientes
- CRUD completo
- Búsqueda y filtrado
- Información de contacto

### Gestión de Préstamos
- Creación con cálculo automático de cuotas
- Configuración de interés y número de cuotas
- Estados: activo, pagado, retrasado
- Generación automática de cuotas

### Gestión de Cuotas
- Vista de cuotas pendientes y retrasadas
- Registro de pagos (parciales o totales)
- Historial de pagos
- Actualización automática de estados

### Reportes
- Reporte general del negocio
- Reporte detallado por cliente
- Métricas de recuperación
- Análisis de cartera

### Sistema de Suscripción
- Plan mensual con Stripe
- Portal de gestión de suscripción
- Bloqueo automático sin suscripción activa
- Webhooks para actualización automática

## 🔒 Seguridad

- Row Level Security (RLS) en Supabase
- Autenticación con JWT
- Variables de entorno para secretos
- Middleware de protección de rutas
- Validación de webhooks de Stripe

## 📱 Responsivo

La aplicación está completamente optimizada para dispositivos móviles, tablets y desktop.

## 🤝 Soporte

Para soporte, contacta a: [tu-email@ejemplo.com]

## 📄 Licencia

Este proyecto es privado y propietario.

---

Desarrollado con ❤️ para gestionar préstamos de forma profesional
=======
# gestor-creditos-webs
>>>>>>> 6a297ed5e244ae82e92682080748948cb576b5dd
