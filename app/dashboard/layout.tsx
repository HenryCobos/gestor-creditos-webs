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
  PlayCircle,
  Package,
  MapPin,
  UserCog,
  Receipt,
  Calculator
} from 'lucide-react'
import { CompanyHeader } from '@/components/company-header'
import { MobileMenu } from '@/components/mobile-menu'

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener perfil del usuario con su organización
  let { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organization:organizations(
        id,
        nombre_negocio,
        plan_id,
        subscription_status,
        plan:planes(id, nombre, slug)
      )
    `)
    .eq('id', user.id)
    .single()

  // Determinar el rol del usuario
  const userRole = profile?.role || 'admin'
  
  // Obtener el plan de la ORGANIZACIÓN (no del usuario individual)
  let planInfo = null
  if (profile?.organization?.plan) {
    planInfo = profile.organization.plan
  } else {
    // Si no hay organización o plan, obtener el plan gratuito
    const { data: freePlan } = await supabase
      .from('planes')
      .select('id, nombre, slug')
      .eq('slug', 'free')
      .single()
    planInfo = freePlan
  }

  // Si no hay perfil, crear uno básico (sin plan individual)
  if (!profile) {
    console.log('🔧 Creando perfil para usuario nuevo...')
    
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email || 'Usuario',
        role: 'admin', // Por defecto admin
        activo: true,
      }, {
        onConflict: 'id'
      })

    if (upsertError) {
      console.error('Error al crear perfil:', upsertError)
    }

    // Recargar el perfil
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select(`
        *,
        organization:organizations(
          id,
          nombre_negocio,
          plan_id,
          subscription_status,
          plan:planes(id, nombre, slug)
        )
      `)
      .eq('id', user.id)
      .single()

    profile = updatedProfile
  }

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <CompanyHeader />
          <MobileMenu 
            user={profile}
            planName={planInfo?.nombre || 'Gratuito'}
            onSignOut={handleSignOut}
            userRole={userRole}
          />
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-card border-r border-border hidden md:block overflow-hidden flex-shrink-0">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-border flex-shrink-0">
            <CompanyHeader />
            <p className="text-sm text-muted-foreground mt-2">
              {profile?.full_name || user.email}
            </p>
            {planInfo && (
              <Link href="/dashboard/subscription">
                <div className="mt-3 px-3 py-2 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20 hover:shadow-md transition-all cursor-pointer">
                  <p className="text-xs text-primary font-medium">Plan Actual</p>
                  <p className="text-sm font-bold text-primary">{planInfo.nombre}</p>
                </div>
              </Link>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            {/* Menú común para todos */}
            <Link href="/dashboard/clientes">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                {userRole === 'cobrador' ? 'Mis Clientes' : 'Clientes'}
              </Button>
            </Link>
            <Link href="/dashboard/prestamos">
              <Button variant="ghost" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                {userRole === 'cobrador' ? 'Mis Préstamos' : 'Préstamos'}
              </Button>
            </Link>
            <Link href="/dashboard/cuotas">
              <Button variant="ghost" className="w-full justify-start">
                <CreditCard className="mr-2 h-4 w-4" />
                {userRole === 'cobrador' ? 'Mis Cuotas' : 'Cuotas'}
              </Button>
            </Link>

            {/* Solo para administradores */}
            {userRole === 'admin' && (
              <>
                <Link href="/dashboard/productos">
                  <Button variant="ghost" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Productos
                  </Button>
                </Link>
                
                {/* Separador visual */}
                <div className="py-2">
                  <div className="border-t border-border"></div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">Gestión de Rutas</p>
                </div>

                <Link href="/dashboard/usuarios">
                  <Button variant="ghost" className="w-full justify-start">
                    <UserCog className="mr-2 h-4 w-4" />
                    Usuarios
                  </Button>
                </Link>
                <Link href="/dashboard/rutas">
                  <Button variant="ghost" className="w-full justify-start">
                    <MapPin className="mr-2 h-4 w-4" />
                    Rutas
                  </Button>
                </Link>
                <Link href="/dashboard/reportes">
                  <Button variant="ghost" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Reportes
                  </Button>
                </Link>
              </>
            )}

            {/* Gastos y Caja para todos con organización */}
            {profile?.organization_id && (
              <>
                <div className="py-2">
                  <div className="border-t border-border"></div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">
                    {userRole === 'cobrador' ? 'Mi Trabajo' : 'Operaciones'}
                  </p>
                </div>

                <Link href="/dashboard/gastos">
                  <Button variant="ghost" className="w-full justify-start">
                    <Receipt className="mr-2 h-4 w-4" />
                    {userRole === 'cobrador' ? 'Mis Gastos' : 'Gastos'}
                  </Button>
                </Link>
                <Link href="/dashboard/caja">
                  <Button variant="ghost" className="w-full justify-start">
                    <Calculator className="mr-2 h-4 w-4" />
                    {userRole === 'cobrador' ? 'Mi Caja' : 'Arqueos'}
                  </Button>
                </Link>
              </>
            )}

            {/* Configuración y tutoriales para todos */}
            {userRole === 'admin' && (
              <>
                <div className="py-2">
                  <div className="border-t border-border"></div>
                </div>
                <Link href="/dashboard/tutoriales">
                  <Button variant="ghost" className="w-full justify-start">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Tutoriales
                  </Button>
                </Link>
              </>
            )}
            <Link href="/dashboard/configuracion">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Button>
            </Link>
          </nav>

          <div className="p-4 border-t border-border flex-shrink-0">
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout

