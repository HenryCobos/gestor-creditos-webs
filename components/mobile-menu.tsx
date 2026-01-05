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
  Package
} from 'lucide-react'

interface MobileMenuProps {
  user: any
  planName: string
  onSignOut: () => Promise<void>
}

export function MobileMenu({ user, planName, onSignOut }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  const menuItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard'
    },
    {
      href: '/dashboard/clientes',
      icon: Users,
      label: 'Clientes'
    },
    {
      href: '/dashboard/prestamos',
      icon: DollarSign,
      label: 'Préstamos'
    },
    {
      href: '/dashboard/productos',
      icon: Package,
      label: 'Productos'
    },
    {
      href: '/dashboard/cuotas',
      icon: CreditCard,
      label: 'Cuotas'
    },
    {
      href: '/dashboard/reportes',
      icon: FileText,
      label: 'Reportes'
    },
    {
      href: '/dashboard/tutoriales',
      icon: PlayCircle,
      label: 'Tutoriales'
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
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
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
        <nav className="space-y-1">
          {menuItems.map((item) => {
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
        <div className="absolute bottom-6 left-6 right-6">
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

