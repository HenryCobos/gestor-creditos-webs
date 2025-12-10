'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/actualizar-contrasena`,
      })

      if (error) {
        throw error
      }

      setEmailSent(true)
      toast({
        title: '¡Email enviado!',
        description: 'Revisa tu correo para restablecer tu contraseña.',
      })
    } catch (error: any) {
      console.error('Error al enviar email:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar el email. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Email Enviado
            </CardTitle>
            <CardDescription>
              Revisa tu bandeja de entrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Te hemos enviado un correo electrónico a <strong>{email}</strong> con las instrucciones para restablecer tu contraseña.
              </p>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>📧 Revisa tu bandeja de entrada</p>
              <p>📁 Si no lo ves, revisa la carpeta de spam</p>
              <p>⏱️ El link expira en 1 hora</p>
            </div>
            <div className="pt-4 space-y-2">
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Login
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
              >
                Usar otro email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Recuperar Contraseña
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tu email y te enviaremos un link para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Link de Recuperación'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

