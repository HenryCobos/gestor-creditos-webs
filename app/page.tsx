import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  TrendingUp, 
  Shield, 
  Clock, 
  Users, 
  FileText,
  BarChart3,
  Zap,
  Lock,
  CreditCard,
  Bell,
  Download,
  ArrowRight,
  Play,
  Star
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Si el usuario ya está logueado, redirigir al dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">GestorPro</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#caracteristicas" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Características
            </a>
            <a href="#precios" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Precios
            </a>
            <a href="#testimonios" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Testimonios
            </a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-sm font-medium">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button className="text-sm font-medium bg-blue-600 hover:bg-blue-700">
                Comenzar Gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Software #1 en Gestión de Créditos
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Control Total de tu Negocio de Créditos
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Gestiona préstamos, clientes y cobros desde una plataforma profesional. 
                Olvídate de Excel y lleva tu negocio al siguiente nivel.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-base px-8 py-6">
                  Probar 30 Días Gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto text-base px-8 py-6 border-slate-300"
              >
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-600">Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-600">Configuración en 5 minutos</span>
              </div>
            </div>
          </div>

          {/* Right Column - Video Demo */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white p-2">
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex items-center justify-center relative group cursor-pointer">
                {/* Placeholder para Video Demo - Reemplazar con iframe de YouTube/Vimeo */}
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-blue-600 flex items-center justify-center group-hover:bg-blue-700 transition-all group-hover:scale-110">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <p className="text-sm text-slate-300">Video Demo del Sistema</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Haz clic para ver cómo funciona GestorPro
                  </p>
                </div>
                {/* 
                  Para agregar video real, reemplaza todo el div de arriba con:
                  <iframe
                    className="w-full h-full rounded-lg"
                    src="https://www.youtube.com/embed/TU_VIDEO_ID"
                    title="Demo GestorPro"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                */}
              </div>
            </div>
            
            {/* Floating Stats Cards */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">+250%</p>
                  <p className="text-sm text-slate-600">Eficiencia</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-lg p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">5,000+</p>
                  <p className="text-sm text-slate-600">Usuarios</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problema → Solución */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">El Problema</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              ¿Cansado de Gestionar Préstamos en Excel?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-lg text-red-900">😰 Desorganización</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Archivos perdidos, versiones desactualizadas, y datos duplicados.
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-lg text-red-900">⏰ Pérdida de Tiempo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Horas calculando manualmente intereses y generando reportes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-lg text-red-900">💸 Dinero Perdido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Cobros olvidados y falta de seguimiento a clientes morosos.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">La Solución</Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-4">
              GestorPro: Todo en un Solo Lugar
            </h3>
          </div>
        </div>
      </section>

      {/* Características Principales */}
      <section id="caracteristicas" className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Características</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Todo lo que Necesitas para Crecer
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Herramientas profesionales diseñadas para gestionar tu negocio de forma eficiente
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Gestión de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Base de datos completa con historial crediticio, documentos y scoring automático de cada cliente.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Control de Préstamos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Cálculo automático de intereses, amortización y cuotas. Seguimiento en tiempo real del estado de cada préstamo.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Recordatorios Automáticos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Notificaciones por email y SMS para cobros próximos y pagos vencidos. Nunca pierdas un cobro.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
                <CardTitle>Reportes Profesionales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Genera contratos, estados de cuenta y reportes financieros en PDF con tu marca. Sin marca de agua.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Analytics Avanzado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Dashboards con métricas clave: tasa de morosidad, ingresos proyectados, ROI por cliente y más.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Seguridad Bancaria</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Encriptación de datos, backups automáticos y cumplimiento con regulaciones de protección de datos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-12">
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Dashboard</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Interfaz Simple y Poderosa
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Dashboard completo con métricas en tiempo real, control de préstamos y análisis de cartera
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white p-4">
            <img 
              src="/dashboard-screenshot.png" 
              alt="Dashboard completo de GestorPro mostrando métricas de préstamos, clientes y reportes"
              className="w-full h-auto rounded-lg"
            />
          </div>
          
          {/* Features destacadas del dashboard */}
          <div className="grid md:grid-cols-4 gap-6 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Métricas en Vivo</h4>
              <p className="text-sm text-slate-600">Visualiza el estado de tu negocio en tiempo real</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Control Total</h4>
              <p className="text-sm text-slate-600">Gestiona préstamos y cobros desde un solo lugar</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Base de Clientes</h4>
              <p className="text-sm text-slate-600">Historial completo de cada cliente y préstamo</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Alertas Automáticas</h4>
              <p className="text-sm text-slate-600">Recordatorios de pagos y cuotas vencidas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Precios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Planes para Cada Etapa de tu Negocio
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Sin compromisos. Cancela cuando quieras. Garantía de 30 días.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Plan Gratuito */}
            <Card className="border-slate-200 relative">
              <CardHeader>
                <CardTitle className="text-2xl">Gratuito</CardTitle>
                <CardDescription>Para empezar</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">$0</span>
                  <span className="text-slate-600">/mes</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Hasta 5 clientes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Hasta 5 préstamos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Reportes básicos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Soporte por email</span>
                  </li>
                </ul>
                <Link href="/register" className="block">
                  <Button variant="outline" className="w-full">
                    Comenzar Gratis
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan Profesional */}
            <Card className="border-blue-200 relative">
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <Badge className="bg-blue-600 text-white">Más Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Profesional</CardTitle>
                <CardDescription>Para freelancers</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">$19</span>
                  <span className="text-slate-600">/mes</span>
                </div>
                <p className="text-sm text-green-600">Ahorra $38 al año</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Hasta 50 clientes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Hasta 50 préstamos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Exportación PDF ilimitada</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Reportes avanzados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Soporte prioritario 24h</span>
                  </li>
                </ul>
                <Link href="/register" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Comenzar Prueba
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan Business */}
            <Card className="border-slate-200 relative">
              <CardHeader>
                <CardTitle className="text-2xl">Business</CardTitle>
                <CardDescription>Para equipos pequeños</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">$49</span>
                  <span className="text-slate-600">/mes</span>
                </div>
                <p className="text-sm text-green-600">Ahorra $98 al año</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Hasta 200 clientes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Hasta 200 préstamos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Hasta 3 usuarios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Todo del Plan Profesional</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Recordatorios automáticos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Roles y permisos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Soporte prioritario 12h</span>
                  </li>
                </ul>
                <Link href="/register" className="block">
                  <Button variant="outline" className="w-full">
                    Comenzar Prueba
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan Enterprise */}
            <Card className="border-amber-200 relative bg-gradient-to-br from-amber-50 to-white">
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <CardDescription>Para empresas</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">$179</span>
                  <span className="text-slate-600">/mes</span>
                </div>
                <p className="text-sm text-green-600">Ahorra $358 al año</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 font-medium">Clientes ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 font-medium">Préstamos ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 font-medium">Usuarios ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Todo del Plan Business</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Reportes personalizados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Soporte prioritario 24/7</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">Capacitación personalizada</span>
                  </li>
                </ul>
                <Link href="/register" className="block">
                  <Button className="w-full bg-amber-600 hover:bg-amber-700">
                    Contactar Ventas
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonios" className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16">
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Testimonios</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Lo que Dicen Nuestros Clientes
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Testimonio 1 */}
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <CardDescription className="text-slate-700 italic">
                "GestorPro cambió completamente mi negocio. Antes perdía horas en Excel, 
                ahora todo es automático. Mi productividad aumentó 300%."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">MR</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">María Rodríguez</p>
                  <p className="text-sm text-slate-600">Prestamista Individual</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testimonio 2 */}
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <CardDescription className="text-slate-700 italic">
                "La mejor inversión que hice para mi empresa. Los reportes automáticos y 
                recordatorios me ahorraron miles de dólares en cobros perdidos."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-600">JG</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Juan García</p>
                  <p className="text-sm text-slate-600">Director, FinanCredit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testimonio 3 */}
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <CardDescription className="text-slate-700 italic">
                "Interfaz súper intuitiva y soporte excepcional. En 5 minutos ya estaba 
                operando. Mis clientes quedaron impresionados con los reportes profesionales."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-green-600">AL</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Ana López</p>
                  <p className="text-sm text-slate-600">CEO, MicroPréstamos SA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">¿Necesito tarjeta de crédito para la prueba gratuita?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  No. Puedes comenzar con el plan gratuito sin ingresar ningún método de pago. 
                  Solo necesitas un email para registrarte.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">¿Puedo cambiar de plan en cualquier momento?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Sí, puedes actualizar o bajar de plan cuando quieras. Los cambios se aplican 
                  inmediatamente y ajustamos la facturación de forma proporcional.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">¿Mis datos están seguros?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Absolutamente. Usamos encriptación de nivel bancario, backups automáticos diarios 
                  y cumplimos con todas las regulaciones de protección de datos.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">¿Ofrecen capacitación?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Sí. Todos los planes incluyen videos tutoriales y documentación completa. 
                  Los planes Business y Enterprise incluyen sesiones de onboarding personalizadas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">¿Puedo importar mis datos de Excel?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Sí, tenemos herramientas de importación que facilitan la migración de tus datos 
                  desde Excel o cualquier otro sistema. Nuestro equipo te ayuda en el proceso.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">¿Qué pasa si cancelo mi suscripción?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Puedes cancelar cuando quieras sin penalizaciones. Tendrás acceso hasta el final 
                  de tu período pagado y podrás exportar todos tus datos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                ¿Listo para Transformar tu Negocio?
              </h2>
              <p className="text-xl text-slate-600">
                Únete a más de 5,000 profesionales que ya confían en GestorPro
              </p>
              <div className="flex justify-center pt-4">
                <Link href="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-6">
                    Comenzar Gratis Ahora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 pt-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Sin tarjeta requerida</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Configuración en 5 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Garantía 30 días</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Column 1 - Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold">GestorPro</span>
              </div>
              <p className="text-slate-400 text-sm">
                Control total de tu negocio de créditos. Software profesional para prestamistas.
              </p>
            </div>

            {/* Column 2 - Producto */}
            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#caracteristicas" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#testimonios" className="hover:text-white transition-colors">Testimonios</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Preguntas Frecuentes</a></li>
              </ul>
            </div>

            {/* Column 3 - Soporte */}
            <div>
              <h3 className="font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Crear Cuenta</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Column 4 - Legal */}
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/terminos" className="hover:text-white transition-colors">Términos de Servicio</Link></li>
                <li><Link href="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-center">
            <p className="text-sm text-slate-400">
              © 2025 GestorPro. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
