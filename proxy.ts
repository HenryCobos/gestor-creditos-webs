import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  // Update session
  const response = await updateSession(request)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/register')
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')

  // Si no hay usuario y está intentando acceder a rutas protegidas
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si hay usuario y está en páginas de auth, redirigir al dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar suscripción para rutas del dashboard
  // TEMPORALMENTE DESACTIVADO - Descomenta cuando configures Stripe
  /*
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    // Si no tiene suscripción activa, redirigir a la página de suscripción
    if (profile?.subscription_status !== 'active' && 
        !request.nextUrl.pathname.startsWith('/dashboard/subscription')) {
      return NextResponse.redirect(new URL('/dashboard/subscription', request.url))
    }
  }
  */

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

