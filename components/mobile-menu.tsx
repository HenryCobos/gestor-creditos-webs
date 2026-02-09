'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Home,
  Users,
  DollarSign,
  FileText,
  CreditCard,
  LogOut,
  Menu,
  Settings,
  X,
  PlayCircle,
  Package,
  MapPin,
  UserCog,
  Receipt,
  Calculator
} from 'lucide-react'

interface MobileMenuProps {
  user: any
  planName: string
  onSignOut: () => Promise<void>
  userRole?: string
}

export function MobileMenu({ user, planName, onSignOut, userRole = 'admin' }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  // Menú común para todos
  const commonMenuItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard'
    },
    {
      href: '/dashboard/clientes',
      icon: Users,
      label: userRole === 'cobrador' ? 'Mis Clientes' : 'Clientes'
    },
    {
      href: '/dashboard/prestamos',
      icon: DollarSign,
      label: userRole === 'cobrador' ? 'Mis Préstamos' : 'Préstamos'
    },
    {
      href: '/dashboard/cuotas',
      icon: CreditCard,
      label: userRole === 'cobrador' ? 'Mis Cuotas' : 'Cuotas'
    }
  ]

  // Menú solo para admin
  const adminMenuItems = [
    {
      href: '/dashboard/productos',
      icon: Package,
      label: 'Productos'
    },
    {
      href: '/dashboard/usuarios',
      icon: UserCog,
      label: 'Usuarios'
    },
    {
      href: '/dashboard/rutas',
      icon: MapPin,
      label: 'Rutas'
    },
    {
      href: '/dashboard/reportes',
      icon: FileText,
      label: 'Reportes'
    }
  ]

  // Gastos y Caja para todos con organización
  const operacionesMenuItems = [
    {
      href: '/dashboard/gastos',
      icon: Receipt,
      label: userRole === 'cobrador' ? 'Mis Gastos' : 'Gastos'
    },
    {
      href: '/dashboard/caja',
      icon: Calculator,
      label: userRole === 'cobrador' ? 'Mi Caja' : 'Arqueos'
    }
  ]

  // Configuración para todos
  const configMenuItems = [
    {
      href: '/dashboard/tutoriales',
      icon: PlayCircle,
      label: 'Tutoriales',
      adminOnly: true
    },
    {
      href: '/dashboard/configuracion',
      icon: Settings,
      label: 'Configuración'
    }
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>

        {/* User Info */}
        <div className="mt-6 mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium text-foreground">
            {user?.full_name || user?.email || 'Usuario'}
          </p>
          <Link href="/dashboard/subscription" onClick={() => setOpen(false)}>
            <div className="mt-2 px-3 py-2 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
              <p className="text-xs text-primary font-medium">Plan Actual</p>
              <p className="text-sm font-bold text-primary">{planName}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1 overflow-y-auto">
          {/* Menú común */}
          {commonMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <Button variant="ghost" className="w-full justify-start">
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}

          {/* Solo para admin */}
          {userRole === 'admin' && (
            <>
              <div className="py-2">
                <div className="border-t border-border"></div>
                <p className="text-xs text-muted-foreground mt-2 px-2">Gestión de Rutas</p>
              </div>
              {adminMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <Button variant="ghost" className="w-full justify-start">
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </>
          )}

          {/* Operaciones (Gastos y Caja) */}
          {user?.organization_id && (
            <>
              <div className="py-2">
                <div className="border-t border-border"></div>
                <p className="text-xs text-muted-foreground mt-2 px-2">
                  {userRole === 'cobrador' ? 'Mi Trabajo' : 'Operaciones'}
                </p>
              </div>
              {operacionesMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <Button variant="ghost" className="w-full justify-start">
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </>
          )}

          {/* Configuración */}
          <div className="py-2">
            <div className="border-t border-border"></div>
          </div>
          {configMenuItems.map((item) => {
            if (item.adminOnly && userRole !== 'admin') return null
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <Button variant="ghost" className="w-full justify-start">
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Sign Out */}
        <div className="pt-4 border-t border-border mt-auto">
          <form action={onSignOut}>
            <Button
              variant="outline"
              className="w-full justify-start"
              type="submit"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

