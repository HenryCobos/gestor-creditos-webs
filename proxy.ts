import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Una sola instancia de Supabase para toda la función del middleware
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

  // Una sola llamada de autenticación — refresca la sesión y obtiene el usuario
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/recuperar-contrasena') ||
    pathname.startsWith('/actualizar-contrasena') ||
    pathname.startsWith('/auth/callback')

  const isProtectedRoute = pathname.startsWith('/dashboard')

  const isPasswordRecovery =
    pathname.startsWith('/recuperar-contrasena') ||
    pathname.startsWith('/actualizar-contrasena') ||
    pathname.startsWith('/auth/callback')

  // Sin sesión intentando acceder al dashboard → login
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión en páginas de auth (excepto recuperación) → dashboard
  if (user && isAuthPage && !isPasswordRecovery) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
