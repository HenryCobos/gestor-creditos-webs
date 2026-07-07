import { Suspense } from 'react'
import { DashboardClient } from './dashboard-client'

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando dashboard...</div>}>
      <DashboardClient />
    </Suspense>
  )
}

