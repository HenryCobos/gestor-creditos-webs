'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { redirectToHotmartCheckout } from '@/lib/hotmart-checkout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { BusinessPlanOffers, ProPlanOffers } from '@/components/plan-offer-cards'
import { planHasTrial, type BillingPeriod } from '@/lib/plan-offers'
import { trackTikTokViewContent } from '@/lib/tiktok-analytics'
import {
  Users,
  TrendingUp,
  Rocket,
  CheckCircle2,
  ChevronRight,
  Star,
  Gift,
} from 'lucide-react'

type ClientesRango = '<10' | '10-50' | '50-200' | '+200'
type ExperienciaRango = 'inicio' | '1-3' | '+3'

const STEP_LABELS = ['Bienvenida', 'Tu negocio', 'Elige tu plan']

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [userName, setUserName] = useState('')
  const [clientesRango, setClientesRango] = useState<ClientesRango | null>(null)
  const [experiencia, setExperiencia] = useState<ExperienciaRango | null>(null)
  const [completando, setCompletando] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutOption, setCheckoutOption] = useState<string | null>(null)

  const necesitaMasCapacidad =
    clientesRango === '10-50' || clientesRango === '50-200' || clientesRango === '+200'

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (step === 3) {
      trackTikTokViewContent('onboarding-plans', 'Onboarding — Elige tu plan')
    }
  }, [step])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const nombre = user.user_metadata?.full_name || user.email?.split('@')[0] || 'ahí'
    setUserName(nombre.split(' ')[0])

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', user.id)
      .single()

    if (profile?.onboarding_completed_at) {
      router.push('/dashboard')
    }
  }

  const markOnboardingComplete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  const handleCompletar = async () => {
    setCompletando(true)
    try {
      await markOnboardingComplete()
      router.push('/dashboard')
    } catch {
      router.push('/dashboard')
    }
  }

  const handleHotmartCheckout = async (
    slug: 'pro' | 'business',
    period: BillingPeriod,
    optionKey: string
  ) => {
    setCheckoutLoading(true)
    setCheckoutOption(optionKey)
    try {
      await markOnboardingComplete()
      const result = await redirectToHotmartCheckout(slug, period, {
        useTrial: planHasTrial(slug, period),
      })
      if (!result.ok) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        setCheckoutLoading(false)
        setCheckoutOption(null)
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo abrir el checkout. Intenta de nuevo.',
        variant: 'destructive',
      })
      setCheckoutLoading(false)
      setCheckoutOption(null)
    }
  }

  const cardWidth = step === 3 ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className={`w-full ${cardWidth}`}>
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
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    step === i + 1 ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
                {i < 2 && (
                  <div
                    className={`h-0.5 w-12 sm:w-20 mx-2 transition-all ${
                      step > i + 1 ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
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
                <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido, {userName}!</h1>
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
                    {(
                      [
                        { value: '<10', label: 'Menos de 10', desc: 'Estoy empezando' },
                        { value: '10-50', label: '10 – 50', desc: 'Negocio en crecimiento' },
                        { value: '50-200', label: '50 – 200', desc: 'Operación sólida' },
                        { value: '+200', label: 'Más de 200', desc: 'Gran volumen' },
                      ] as const
                    ).map(({ value, label, desc }) => (
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
                    {(
                      [
                        { value: 'inicio', label: 'Estoy empezando' },
                        { value: '1-3', label: '1 – 3 años' },
                        { value: '+3', label: 'Más de 3 años' },
                      ] as const
                    ).map(({ value, label }) => (
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

        {/* PASO 3: Elige tu plan */}
        {step === 3 && (
          <Card className="shadow-xl border-0">
            <CardContent className="pt-8 pb-8 px-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                  <Gift className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Elige cómo empezar</h2>
                <p className="text-gray-500 text-sm">
                  Prueba 7 días gratis o activa el plan que mejor encaje con tu negocio.
                </p>
              </div>

              {necesitaMasCapacidad ? (
                <BusinessPlanOffers
                  loading={checkoutLoading}
                  loadingOption={checkoutOption}
                  onSelect={(period) =>
                    handleHotmartCheckout('business', period, `business-${period}`)
                  }
                />
              ) : (
                <ProPlanOffers
                  loading={checkoutLoading}
                  loadingOption={checkoutOption}
                  onSelect={(period) =>
                    handleHotmartCheckout('pro', period, `pro-${period}`)
                  }
                />
              )}

              <button
                type="button"
                onClick={handleCompletar}
                disabled={completando || checkoutLoading}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                {completando ? 'Entrando...' : 'Continuar con el plan gratuito'}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
