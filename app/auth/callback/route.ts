import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/actualizar-contrasena'

  if (code) {
    const supabase = await createClient()
    
    try {
      // Intercambiar el código por una sesión
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error al intercambiar código:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`)
      }
      
      // Redirigir a la página de actualizar contraseña
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    } catch (error) {
      console.error('Error en callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`)
    }
  }

  // Si no hay código, redirigir al login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}

