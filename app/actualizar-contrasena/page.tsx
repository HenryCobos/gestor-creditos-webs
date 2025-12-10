'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Lock, CheckCircle2 } from 'lucide-react'

export default function ActualizarContrasenaPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    // Verificar que hay una sesión válida
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // No hay sesión activa, redirigir al login
        toast({
          title: 'Error',
          description: 'Sesión expirada. Solicita un nuevo link de recuperación.',
          variant: 'destructive',
        })
        setTimeout(() => {
          router.push('/recuperar-contrasena')
        }, 2000)
      }
    }
    
    checkSession()
  }, [supabase, router, toast])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      setUpdated(true)
      toast({
        title: '¡Contraseña actualizada!',
        description: 'Tu contraseña ha sido cambiada exitosamente',
      })

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error al actualizar contraseña:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la contraseña',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (updated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              ¡Contraseña Actualizada!
            </CardTitle>
            <CardDescription>
              Tu contraseña ha sido cambiada exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-900 text-center">
                Redirigiendo al dashboard...
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full"
            >
              Ir al Dashboard
            </Button>
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
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Nueva Contraseña
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-slate-500">
                Mínimo 6 caracteres
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

