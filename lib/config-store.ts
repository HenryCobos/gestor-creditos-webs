"use client"

import { create } from 'zustand'

export interface AppConfig {
  companyName: string
  companyLogo: string | null
  primaryColor: string
  accentColor: string
  showLogo: boolean
  currency: string
  currencySymbol: string
}

interface ConfigStore {
  config: AppConfig
  updateConfig: (config: Partial<AppConfig>) => void
  resetConfig: () => void
}

const defaultConfig: AppConfig = {
  companyName: 'Gestor de Créditos',
  companyLogo: null,
  primaryColor: '#3b82f6', // blue-500
  accentColor: '#8b5cf6', // purple-500
  showLogo: false,
  currency: 'USD',
  currencySymbol: '$',
}

// Cargar configuración desde localStorage
const loadConfig = (): AppConfig => {
  if (typeof window === 'undefined') return defaultConfig
  try {
    const stored = localStorage.getItem('app-config-storage')
    return stored ? JSON.parse(stored) : defaultConfig
  } catch {
    return defaultConfig
  }
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: loadConfig(),
  updateConfig: (newConfig) =>
    set((state) => {
      const updated = { ...state.config, ...newConfig }
      if (typeof window !== 'undefined') {
        localStorage.setItem('app-config-storage', JSON.stringify(updated))
      }
      return { config: updated }
    }),
  resetConfig: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-config-storage', JSON.stringify(defaultConfig))
    }
    set({ config: defaultConfig })
  },
}))

