# Variables de entorno locales

Copia `.env.example` a `.env.local` y completa los valores.

```bash
cp .env.example .env.local
```

| Variable | Dónde obtenerla |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service_role, **secreto**) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal Developer Dashboard o Vercel env vars |

**Nunca** commitees `.env.local`. Ya está en `.gitignore`.

Para configurar en otra máquina (Mac), ver `SETUP-MAC.md`.
