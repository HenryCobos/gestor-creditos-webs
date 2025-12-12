'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Check, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Zap,
  Crown,
  Rocket,
  Star,
  ShieldCheck,
  Gift,
  Sparkles,
  Tag
} from 'lucide-react'
import { useSubscriptionStore } from '@/lib/subscription-store'
import { loadPlans, loadUserSubscription, loadUsageLimits, getPlanBenefits } from '@/lib/subscription-helpers'
import type { Plan } from '@/lib/subscription-store'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const router = useRouter()
  const { toast } = useToast()
  const {
    plans,
    userSubscription,
    usageLimits,
    setPlans,
    setUserSubscription,
    setUsageLimits,
    getCurrentPlan,
  } = useSubscriptionStore()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [plansData, subscriptionData, limitsData] = await Promise.all([
      loadPlans(),
      loadUserSubscription(),
      loadUsageLimits(),
    ])

    setPlans(plansData)
    if (subscriptionData) setUserSubscription(subscriptionData)
    if (limitsData) setUsageLimits(limitsData)
    setLoading(false)
  }

  const currentPlan = getCurrentPlan()

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.slug === 'free') {
      toast({
        title: 'Plan Gratuito',
        description: 'Ya estás en el plan gratuito o puedes contactarnos para volver a él',
      })
      return
    }

    // Redirigir a PayPal o mostrar modal de pago
    router.push(`/dashboard/subscription/checkout?plan=${plan.id}&period=${selectedPeriod}`)
  }

  const getPlanIcon = (slug: string) => {
    const icons = {
      free: Zap,
      pro: TrendingUp,
      business: Users,
      enterprise: Crown,
    }
    const Icon = icons[slug as keyof typeof icons] || Star
    return <Icon className="w-6 h-6" />
  }

  const getPlanColor = (slug: string) => {
    const colors = {
      free: 'from-gray-500 to-gray-700',
      pro: 'from-blue-500 to-blue-700',
      business: 'from-purple-500 to-purple-700',
      enterprise: 'from-amber-500 to-amber-700',
    }
    return colors[slug as keyof typeof colors] || 'from-gray-500 to-gray-700'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planes y Precios</h1>
          <p className="text-gray-500 mt-1">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Elige el Plan Perfecto para Tu Negocio
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Gestiona tus préstamos de forma profesional. Sin compromisos, cancela cuando quieras.
        </p>
        
        {/* Plan Actual */}
        {currentPlan && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Plan Actual: <span className="font-bold">{currentPlan.nombre}</span>
            </span>
          </div>
        )}
      </div>

      {/* 🎄 Banner Promoción Navideña */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-green-600 to-red-600 p-1 animate-gradient">
        <div className="bg-white rounded-xl p-6 md:p-8 relative overflow-hidden">
          {/* Decoración de copos de nieve */}
          <div className="absolute top-0 right-0 text-red-100 opacity-20">
            <Sparkles className="w-32 h-32" />
          </div>
          <div className="absolute bottom-0 left-0 text-green-100 opacity-20">
            <Gift className="w-24 h-24" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Contenido */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <Gift className="w-6 h-6 text-red-600 animate-bounce" />
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wide">
                  🎄 Oferta Navideña - Solo Diciembre
                </span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
                <span className="text-red-600">50% OFF</span> en tus Primeros 6 Meses
              </h2>
              
              <p className="text-lg text-gray-600 mb-4">
                ¡Empieza 2025 transformando tu negocio! Usa el cupón especial al momento de pagar.
              </p>
              
              {/* Cupón destacado */}
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-dashed border-yellow-400 rounded-lg px-6 py-3">
                <Tag className="w-5 h-5 text-yellow-700" />
                <div className="text-left">
                  <p className="text-xs text-yellow-700 font-medium uppercase tracking-wide">Código de Cupón</p>
                  <p className="text-2xl font-black text-yellow-900 tracking-wider">50 OFF</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('50 OFF')
                    toast({
                      title: '¡Copiado!',
                      description: 'Cupón copiado al portapapeles',
                    })
                  }}
                  className="ml-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
            
            {/* Visual de regalo */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-red-500 to-green-500 rounded-2xl flex items-center justify-center transform hover:scale-110 transition-transform">
                  <Gift className="w-16 h-16 md:w-20 md:h-20 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-2xl font-black text-red-600">50%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Period */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setSelectedPeriod('monthly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            selectedPeriod === 'monthly'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setSelectedPeriod('yearly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
            selectedPeriod === 'yearly'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Anual
          <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
            -20%
          </Badge>
        </button>
      </div>

      {/* Usage Stats */}
      {usageLimits && currentPlan && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Tu Uso Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Clientes</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {usageLimits.clientes.current}
                  {usageLimits.clientes.limit > 0 && (
                    <span className="text-sm text-gray-500 font-normal"> / {usageLimits.clientes.limit}</span>
                  )}
                </div>
                {usageLimits.clientes.limit > 0 && (
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{
                        width: `${(usageLimits.clientes.current / usageLimits.clientes.limit) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Préstamos Activos</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {usageLimits.prestamos.current}
                  {usageLimits.prestamos.limit > 0 && (
                    <span className="text-sm text-gray-500 font-normal"> / {usageLimits.prestamos.limit}</span>
                  )}
                </div>
                {usageLimits.prestamos.limit > 0 && (
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all"
                      style={{
                        width: `${(usageLimits.prestamos.current / usageLimits.prestamos.limit) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Plan</span>
                  <Rocket className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {currentPlan.nombre}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {currentPlan.slug === 'free' ? 'Gratis para siempre' : 'Suscripción activa'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id
          const benefits = getPlanBenefits(plan.slug)
          const precio = selectedPeriod === 'monthly' ? plan.precio_mensual : plan.precio_anual

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all hover:shadow-xl ${
                isCurrentPlan ? 'ring-2 ring-blue-500 shadow-lg' : ''
              } ${plan.slug === 'pro' ? 'md:scale-105 z-10' : ''}`}
            >
              {plan.slug === 'pro' && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MÁS POPULAR
                  </div>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute top-0 left-0">
                  <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                    ACTUAL
                  </div>
                </div>
              )}

              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getPlanColor(plan.slug)} flex items-center justify-center text-white mb-4`}>
                  {getPlanIcon(plan.slug)}
                </div>
                <CardTitle className="text-2xl">{plan.nombre}</CardTitle>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-bold">
                    ${precio.toFixed(0)}
                  </span>
                  <span className="text-gray-500">
                    /{selectedPeriod === 'monthly' ? 'mes' : 'año'}
                  </span>
                </div>
                {selectedPeriod === 'yearly' && precio > 0 && (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    Ahorras ${(plan.precio_mensual * 12 - plan.precio_anual).toFixed(0)} al año
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : plan.slug === 'pro' ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan
                    ? 'Plan Actual'
                    : plan.slug === 'free'
                    ? 'Contactar'
                    : 'Seleccionar Plan'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Garantía de Satisfacción Hotmart */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Garantía de Satisfacción de 7 Días
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-xs rounded-full font-bold uppercase">Garantizado</span>
              </h3>
              <p className="text-gray-600 mt-1 max-w-xl">
                Prueba cualquier plan con total tranquilidad. Si no estás 100% satisfecho en los primeros 7 días, solicita tu reembolso directamente en Hotmart. Sin preguntas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
