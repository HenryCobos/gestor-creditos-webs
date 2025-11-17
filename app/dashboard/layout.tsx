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
  Settings
} from 'lucide-react'
import { CompanyHeader } from '@/components/company-header'

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <CompanyHeader />
            <p className="text-sm text-gray-500 mt-2">
              {profile?.full_name || user.email}
            </p>
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
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout

