"use client"

import { useConfigStore } from '@/lib/config-store'

export function CompanyHeader() {
  const { config } = useConfigStore()

  return (
    <div>
      <h1 
        className="text-xl font-bold"
        style={{ color: config.primaryColor }}
      >
        {config.companyName}
      </h1>
      <p className="text-xs text-gray-500">Sistema de Gestión</p>
    </div>
  )
}

