import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // getSession() lee la cookie sin hacer llamada de red → muy rápido en Edge
  // getUser() (validación completa) se hace en los server components individuales
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  const isPasswordRecovery =
    pathname.startsWith('/recuperar-contrasena') ||
    pathname.startsWith('/actualizar-contrasena') ||
    pathname.startsWith('/auth/callback')

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    isPasswordRecovery

  const isProtectedRoute = pathname.startsWith('/dashboard')

  // Sin sesión en dashboard → redirigir a login
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión en páginas de auth (excepto recuperación) → redirigir al dashboard
  if (session && isAuthPage && !isPasswordRecovery) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  // Solo ejecutar middleware en rutas que realmente necesitan verificación de auth
  // Excluye: archivos estáticos, imágenes, API routes, fuentes, etc.
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/recuperar-contrasena',
    '/actualizar-contrasena',
    '/auth/callback',
  ],
}
