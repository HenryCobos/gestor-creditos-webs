"use client"

import { create } from 'zustand'

export interface Plan {
  id: string
  nombre: string
  slug: string
  precio_mensual: number
  precio_anual: number
  limite_clientes: number
  limite_prestamos: number
  limite_usuarios: number
  caracteristicas: {
    exportar_pdf: boolean
    sin_marca_agua: boolean
    recordatorios: boolean
    multi_usuario: boolean
    api: string | boolean
    marca_blanca?: boolean
    soporte: string
    historial_dias: number
    paypal_plan_id_monthly?: string
    paypal_plan_id_yearly?: string
  }
  activo: boolean
  orden: number
}

export interface UserSubscription {
  plan_id: string
  plan?: Plan
  subscription_status: 'active' | 'cancelled' | 'expired' | 'pending'
  subscription_period: 'monthly' | 'yearly'
  subscription_start_date: string | null
  subscription_end_date: string | null
  paypal_subscription_id: string | null
  payment_method: string | null
}

export interface UsageLimits {
  clientes: {
    current: number
    limit: number
    canAdd: boolean
  }
  prestamos: {
    current: number
    limit: number
    canAdd: boolean
  }
  usuarios: {
    current: number
    limit: number
    canAdd: boolean
  }
}

interface SubscriptionStore {
  userSubscription: UserSubscription | null
  plans: Plan[]
  usageLimits: UsageLimits | null
  loading: boolean
  
  setUserSubscription: (subscription: UserSubscription) => void
  setPlans: (plans: Plan[]) => void
  setUsageLimits: (limits: UsageLimits) => void
  setLoading: (loading: boolean) => void
  
  // Helper methods
  getCurrentPlan: () => Plan | null
  canExportPDF: () => boolean
  canAddCliente: () => boolean
  canAddPrestamo: () => boolean
  isFreePlan: () => boolean
  isPaidPlan: () => boolean
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  userSubscription: null,
  plans: [],
  usageLimits: null,
  loading: true,
  
  setUserSubscription: (subscription) => set({ userSubscription: subscription }),
  setPlans: (plans) => set({ plans }),
  setUsageLimits: (limits) => set({ usageLimits: limits }),
  setLoading: (loading) => set({ loading }),
  
  getCurrentPlan: () => {
    const { userSubscription, plans } = get()
    if (!userSubscription) return null
    return plans.find(p => p.id === userSubscription.plan_id) || null
  },
  
  canExportPDF: () => {
    const plan = get().getCurrentPlan()
    return plan?.caracteristicas?.exportar_pdf || false
  },
  
  canAddCliente: () => {
    const { usageLimits } = get()
    return usageLimits?.clientes.canAdd ?? true
  },
  
  canAddPrestamo: () => {
    const { usageLimits } = get()
    return usageLimits?.prestamos.canAdd ?? true
  },
  
  isFreePlan: () => {
    const plan = get().getCurrentPlan()
    return plan?.slug === 'free'
  },
  
  isPaidPlan: () => {
    const plan = get().getCurrentPlan()
    return plan?.slug !== 'free'
  },
}))

