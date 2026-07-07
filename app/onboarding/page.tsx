'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import {
  Users,
  TrendingUp,
  Rocket,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Star,
  Clock,
  Gift,
} from 'lucide-react'

type ClientesRango = '<10' | '10-50' | '50-200' | '+200'
type ExperienciaRango = 'inicio' | '1-3' | '+3'

const STEP_LABELS = ['Bienvenida', 'Tu negocio', 'Empieza ya']

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [userName, setUserName] = useState('')
  const [clientesRango, setClientesRango] = useState<ClientesRango | null>(null)
  const [experiencia, setExperiencia] = useState<ExperienciaRango | null>(null)
  const [primerClienteNombre, setPrimerClienteNombre] = useState('')
  const [primerClienteTelefono, setPrimerClienteTelefono] = useState('')
  const [savingCliente, setSavingCliente] = useState(false)
  const [clienteGuardado, setClienteGuardado] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [completando, setCompletando] = useState(false)

  const necesitaMasCapacidad = clientesRango === '10-50' || clientesRango === '50-200' || clientesRango === '+200'

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const nombre = user.user_metadata?.full_name || user.email?.split('@')[0] || 'ahí'
    setUserName(nombre.split(' ')[0])

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, onboarding_completed_at')
      .eq('id', user.id)
      .single()

    if (profile?.onboarding_completed_at) {
      router.push('/dashboard')
      return
    }
    if (profile?.organization_id) {
      setOrganizationId(profile.organization_id)
    }
  }

  const handleGuardarCliente = async () => {
    if (!primerClienteNombre.trim()) return
    setSavingCliente(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('clientes').insert({
        nombre: primerClienteNombre.trim(),
        telefono: primerClienteTelefono.trim() || null,
        organization_id: organizationId,
        created_by: user.id,
      })

      if (error) throw error
      setClienteGuardado(true)
      toast({ title: '¡Cliente guardado!', description: `${primerClienteNombre} ya está en tu lista.` })
    } catch {
      toast({ title: 'No se pudo guardar', description: 'Puedes añadirlo después desde el dashboard.', variant: 'destructive' })
    } finally {
      setSavingCliente(false)
    }
  }

  const handleCompletar = async () => {
    setCompletando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id)

      if (necesitaMasCapacidad) {
        router.push('/dashboard?trial=true')
      } else {
        router.push('/dashboard')
      }
    } catch {
      router.push('/dashboard')
    }
  }

  const handleActivarTrial = async () => {
    setCompletando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id)

      const res = await fetch('/api/activate-trial', { method: 'POST' })
      if (res.ok) {
        toast({ title: '¡Trial Pro activado! 7 días gratis.', description: 'Accedes a 50 clientes y todas las funciones Pro.' })
        router.push('/dashboard?trial=activated')
      } else {
        router.push('/dashboard')
      }
    } catch {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Barra de progreso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step > i + 1
                      ? 'bg-green-500 text-white'
                      : step === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {label}
                </span>
                {i < 2 && (
                  <div className={`h-0.5 w-12 sm:w-20 mx-2 transition-all ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PASO 1: Bienvenida */}
        {step === 1 && (
          <Card className="shadow-xl border-0">
            <CardContent className="pt-8 pb-8 px-8 space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Rocket className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ¡Bienvenido, {userName}!
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  En 2 minutos tendrás tu negocio de préstamos completamente organizado. Vamos paso a paso.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Users, text: 'Gestiona tus clientes y préstamos en un solo lugar' },
                  { icon: TrendingUp, text: 'Controla cobros, cuotas y reportes automáticamente' },
                  { icon: Star, text: 'Genera contratos PDF profesionales al instante' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-700">{text}</p>
                  </div>
                ))}
              </div>

              <Button
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(2)}
              >
                Empezar ahora
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 2: Perfil del negocio */}
        {step === 2 && (
          <Card className="shadow-xl border-0">
            <CardContent className="pt-8 pb-8 px-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-gray-900">Cuéntanos sobre tu negocio</h2>
                <p className="text-gray-500 text-sm">Esto nos ayuda a mostrarte la mejor opción para ti.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    ¿Cuántos clientes gestionas actualmente?
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: '<10', label: 'Menos de 10', desc: 'Estoy empezando' },
                      { value: '10-50', label: '10 – 50', desc: 'Negocio en crecimiento' },
                      { value: '50-200', label: '50 – 200', desc: 'Operación sólida' },
                      { value: '+200', label: 'Más de 200', desc: 'Gran volumen' },
                    ] as const).map(({ value, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setClientesRango(value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          clientesRango === value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-sm text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    ¿Cuánto llevas en el negocio de préstamos?
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'inicio', label: 'Estoy empezando' },
                      { value: '1-3', label: '1 – 3 años' },
                      { value: '+3', label: 'Más de 3 años' },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setExperiencia(value)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          experiencia === value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-xs text-gray-900">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(3)}
                disabled={!clientesRango || !experiencia}
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 3: Primer cliente + oferta */}
        {step === 3 && (
          <Card className="shadow-xl border-0">
            <CardContent className="pt-8 pb-8 px-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Registra tu primer cliente</h2>
                <p className="text-gray-500 text-sm">
                  Tu primera victoria rápida: 30 segundos y ya tienes un cliente listo.
                </p>
              </div>

              {!clienteGuardado ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="nombre" className="text-sm font-medium">Nombre del cliente</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej. Juan Pérez"
                      value={primerClienteNombre}
                      onChange={(e) => setPrimerClienteNombre(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono" className="text-sm font-medium">Teléfono (opcional)</Label>
                    <Input
                      id="telefono"
                      placeholder="+57 300 000 0000"
                      value={primerClienteTelefono}
                      onChange={(e) => setPrimerClienteTelefono(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleGuardarCliente}
                    disabled={!primerClienteNombre.trim() || savingCliente}
                  >
                    {savingCliente ? 'Guardando...' : 'Guardar primer cliente'}
                  </Button>
                  <button
                    type="button"
                    onClick={handleCompletar}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Omitir por ahora
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800 font-medium">
                      ¡{primerClienteNombre} está en tu lista!
                    </p>
                  </div>
                </div>
              )}

              {/* Oferta de trial si tiene muchos clientes */}
              {necesitaMasCapacidad && (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 text-white space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-yellow-300" />
                    <p className="font-bold text-sm uppercase tracking-wide text-yellow-300">Oferta especial para ti</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg">7 días gratis del Plan Pro</p>
                    <p className="text-blue-100 text-sm mt-1">
                      Gestionas {clientesRango} clientes — necesitas más capacidad. Prueba Pro gratis: 50 clientes, PDFs sin marca de agua, soporte prioritario.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <Clock className="w-4 h-4" />
                    <span>Sin tarjeta de crédito. Sin compromisos.</span>
                  </div>
                  <Button
                    className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold h-11"
                    onClick={handleActivarTrial}
                    disabled={completando}
                  >
                    {completando ? 'Activando...' : 'Activar 7 días gratis'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <button
                    type="button"
                    onClick={handleCompletar}
                    disabled={completando}
                    className="w-full text-xs text-blue-300 hover:text-white transition-colors"
                  >
                    Continuar con el plan gratuito
                  </button>
                </div>
              )}

              {/* Para usuarios con pocos clientes */}
              {!necesitaMasCapacidad && clienteGuardado && (
                <Button
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                  onClick={handleCompletar}
                  disabled={completando}
                >
                  {completando ? 'Entrando...' : 'Ir al Dashboard'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {!necesitaMasCapacidad && !clienteGuardado && clienteGuardado === false && (
                <Button
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                  onClick={handleCompletar}
                  disabled={completando}
                >
                  {completando ? 'Entrando...' : 'Ir al Dashboard'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
