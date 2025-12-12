import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Users, 
  DollarSign, 
  FileText, 
  CreditCard, 
  LogOut,
  Menu,
  Settings,
  PlayCircle
} from 'lucide-react'
import { CompanyHeader } from '@/components/company-header'
import { MobileMenu } from '@/components/mobile-menu'

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener plan gratuito primero (lo usaremos si hace falta)
  const { data: freePlan } = await supabase
    .from('planes')
    .select('id, nombre, slug')
    .eq('slug', 'free')
    .single()

  let { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      plan:planes(id, nombre, slug)
    `)
    .eq('id', user.id)
    .single()

  // Si el perfil no existe, no tiene plan, o el plan no se cargó correctamente
  if (freePlan && (!profile || !profile.plan_id || !profile.plan)) {
    console.log('🔧 Usuario sin perfil o sin plan, asignando plan gratuito...')
    
    // Usar UPSERT para crear o actualizar
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email || 'Usuario',
        plan_id: freePlan.id,
        subscription_status: 'active',
        subscription_period: 'monthly',
      }, {
        onConflict: 'id'
      })

    if (upsertError) {
      console.error('Error al crear/actualizar perfil:', upsertError)
    }

    // Recargar el perfil
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select(`
        *,
        plan:planes(id, nombre, slug)
      `)
      .eq('id', user.id)
      .single()

    profile = updatedProfile
    
    // Si todavía no hay perfil o plan, usar fallback
    if (!profile || !profile.plan) {
      profile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email || 'Usuario',
        plan_id: freePlan.id,
        plan: freePlan,
        subscription_status: 'active',
        subscription_period: 'monthly',
        subscription_start_date: null,
        subscription_end_date: null,
        paypal_subscription_id: null,
        payment_method: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any
    }
  }

  // Asegurar que siempre haya un plan
  if (profile && !profile.plan && profile.plan_id && freePlan && profile.plan_id === freePlan.id) {
    profile.plan = freePlan as any
  }

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <CompanyHeader />
          <MobileMenu 
            user={profile}
            planName={profile?.plan?.nombre || 'Gratuito'}
            onSignOut={handleSignOut}
          />
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <CompanyHeader />
            <p className="text-sm text-gray-500 mt-2">
              {profile?.full_name || user.email}
            </p>
            {profile?.plan && (
              <Link href="/dashboard/subscription">
                <div className="mt-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-all cursor-pointer">
                  <p className="text-xs text-blue-600 font-medium">Plan Actual</p>
                  <p className="text-sm font-bold text-blue-900">{profile.plan.nombre}</p>
                </div>
              </Link>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/clientes">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Clientes
              </Button>
            </Link>
            <Link href="/dashboard/prestamos">
              <Button variant="ghost" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Préstamos
              </Button>
            </Link>
            <Link href="/dashboard/cuotas">
              <Button variant="ghost" className="w-full justify-start">
                <CreditCard className="mr-2 h-4 w-4" />
                Cuotas
              </Button>
            </Link>
            <Link href="/dashboard/reportes">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Reportes
              </Button>
            </Link>
            <Link href="/dashboard/tutoriales">
              <Button variant="ghost" className="w-full justify-start">
                <PlayCircle className="mr-2 h-4 w-4" />
                Tutoriales
              </Button>
            </Link>
            <Link href="/dashboard/configuracion">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Button>
            </Link>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <form action={handleSignOut}>
              <Button variant="outline" className="w-full justify-start" type="submit">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout

