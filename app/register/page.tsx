'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { trackSignupConversion } from '@/lib/analytics'
import { validateEmail, normalizeEmail } from '@/lib/utils/email-validation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Validar email en tiempo real
  const handleEmailChange = (value: string) => {
    setEmail(value)
    
    // Solo validar si hay algo escrito
    if (value.trim()) {
      const validation = validateEmail(value)
      if (!validation.valid) {
        setEmailError(validation.error || null)
        setEmailSuggestion(validation.suggestion || null)
      } else {
        setEmailError(null)
        setEmailSuggestion(null)
      }
    } else {
      setEmailError(null)
      setEmailSuggestion(null)
    }
  }

  // Aplicar sugerencia de email
  const applySuggestion = () => {
    if (emailSuggestion) {
      setEmail(emailSuggestion)
      setEmailError(null)
      setEmailSuggestion(null)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validación final antes de enviar
      const validation = validateEmail(email)
      if (!validation.valid) {
        toast({
          title: 'Email inválido',
          description: validation.error,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Normalizar email antes de registrar
      const normalizedEmail = normalizeEmail(email)

      // Registrar usuario
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario')
      }

      // 🎯 CONVERSIÓN PRIMARIA: Usuario se registró
      trackSignupConversion(authData.user.id)

      // Mostrar mensaje de éxito
      toast({
        title: '¡Cuenta creada con éxito! 🎉',
        description: 'Revisa tu email para confirmar tu cuenta',
      })

      // Redirigir a página de bienvenida con instrucciones
      router.push('/bienvenida')

    } catch (error: any) {
      console.error('Error al registrar:', error)
      toast({
        title: 'Error al crear cuenta',
        description: error.message || 'Ocurrió un error. Por favor intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Crear Cuenta
          </CardTitle>
          <CardDescription className="text-center">
            Regístrate para comenzar a gestionar tus créditos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                className={emailError ? 'border-red-500' : ''}
              />
              
              {/* Mensaje de error */}
              {emailError && !emailSuggestion && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {emailError}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Sugerencia de corrección */}
              {emailSuggestion && (
                <Alert className="py-2 border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">
                    {emailError}
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="ml-2 text-blue-600 font-semibold hover:underline"
                    >
                      Usar: {emailSuggestion}
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Indicador de email válido */}
              {email && !emailError && !emailSuggestion && email.includes('@') && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Email válido</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

