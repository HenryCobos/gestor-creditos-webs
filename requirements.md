Nombre del Proyecto: Gestor de Créditos Web



Objetivo:

Crear una aplicación web SaaS (Software as a Service) que permita a prestamistas gestionar préstamos, clientes, cuotas, intereses, pagos retrasados y generar reportes automáticos.



Características del MVP:

1. Registro e inicio de sesión con email y contraseña (Supabase Auth).

2. Base de datos de clientes:

   - Nombre

   - DNI

   - Teléfono

   - Dirección

3. Gestión de préstamos:

   - Monto prestado

   - Interés a aplicar

   - Número de cuotas

   - Fecha de inicio

   - Estado (activo, pagado, retrasado)

4. Gestión de cuotas:

   - Cálculo automático de cuotas

   - Registro de pagos

   - Marcar cuotas como pagadas

   - Manejo de retrasos

5. Dashboard con métricas:

   - Préstamos activos

   - Total prestado

   - Total recuperado

   - Ganancia de intereses

   - Clientes activos

6. Módulo de reportes:

   - Reporte general

   - Reporte por cliente

7. Módulo de suscripción (Stripe):

   - Plan mensual

   - Bloqueo de funcionalidades si no paga

8. UI limpia estilo dashboard profesional con Tailwind Elements y shadcn UI.



Tecnologías:

- Next.js 14 (App Router)

- TypeScript

- TailwindCSS

- Supabase (auth + base de datos)

- Stripe (suscripciones)

- Zustand (estado global)

- Prisma (opcional, si se usa PostgreSQL propio)



Prioridad:

Desarrollar el MVP en no más de 48 horas, listo para publicar y comenzar campañas de Google Ads.

