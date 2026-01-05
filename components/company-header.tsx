"use client"

import { useConfigStore } from '@/lib/config-store'

export function CompanyHeader() {
  const { config } = useConfigStore()

  return (
    <div className="flex items-center gap-3">
      {config.companyLogo && (
        <div className="relative h-10 w-10 flex-shrink-0">
          <img
            src={config.companyLogo}
            alt={`${config.companyName} Logo`}
            className="h-full w-full object-contain"
            onError={(e) => {
              // Si falla la carga, ocultar el logo
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}
      <div>
        <h1 
          className="text-xl font-bold"
          style={{ color: config.primaryColor }}
        >
          {config.companyName}
        </h1>
        <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
      </div>
    </div>
  )
}

