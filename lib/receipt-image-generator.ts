'use client'

import { format } from 'date-fns'
import type {
  ReciboCuotaInfo,
  ReciboCuotaPrestamo,
  ReciboCuotaCliente,
  ReciboEvolucionOptions,
} from '@/lib/pdf-generator'

const WIDTH = 400
const MARGIN = 24
const HEADER_H = 72

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const [y, m, d] = datePart.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Recibo minimalista en PNG, ideal para compartir por WhatsApp. */
export function generarReciboImagenSimple(
  cuotaPago: ReciboCuotaInfo,
  todasLasCuotas: ReciboCuotaInfo[],
  prestamo: ReciboCuotaPrestamo,
  cliente: ReciboCuotaCliente,
  options: ReciboEvolucionOptions = {}
) {
  const { companyName = 'Gestor de Créditos', currency = 'USD' } = options

  const cuotasHistorial = todasLasCuotas
    .filter((c) => c.numero_cuota <= cuotaPago.numero_cuota)
    .sort((a, b) => a.numero_cuota - b.numero_cuota)

  const totalPagadoHistorial = cuotasHistorial.reduce((sum, c) => sum + (c.monto_pagado || 0), 0)
  const saldoPendiente = Math.max(0, prestamo.monto_total - totalPagadoHistorial)

  const nRecibo = cuotaPago.id.replace(/-/g, '').slice(-8).toUpperCase()
  const hoy = format(new Date(), 'dd/MM/yyyy HH:mm')

  const contentLines = [
    { label: 'Cliente', value: cliente.nombre },
    { label: 'Cuota', value: `${cuotaPago.numero_cuota} de ${prestamo.numero_cuotas}` },
    { label: 'Fecha de pago', value: fmtDate(cuotaPago.fecha_pago) },
    { label: 'Saldo pendiente', value: fmt(saldoPendiente, currency) },
  ]

  const bodyH = 48 + contentLines.length * 36 + 80 + 40
  const HEIGHT = HEADER_H + bodyH

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Fondo
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Header azul
  ctx.fillStyle = '#2563eb'
  ctx.fillRect(0, 0, WIDTH, HEADER_H)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(companyName, WIDTH / 2, 28)

  ctx.font = '12px Helvetica, Arial, sans-serif'
  ctx.fillText('COMPROBANTE DE PAGO', WIDTH / 2, 52)

  // Metadatos
  let y = HEADER_H + 20
  ctx.fillStyle = '#374151'
  ctx.font = '11px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`N° Recibo: ${nRecibo}`, MARGIN, y)
  ctx.textAlign = 'right'
  ctx.fillText(`Emisión: ${hoy}`, WIDTH - MARGIN, y)

  // Separador
  y += 12
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(WIDTH - MARGIN, y)
  ctx.stroke()

  // Monto pagado destacado
  y += 36
  ctx.textAlign = 'center'
  ctx.fillStyle = '#6b7280'
  ctx.font = '11px Helvetica, Arial, sans-serif'
  ctx.fillText('MONTO PAGADO', WIDTH / 2, y)

  y += 28
  ctx.fillStyle = '#7c3aed'
  ctx.font = 'bold 26px Helvetica, Arial, sans-serif'
  ctx.fillText(fmt(cuotaPago.monto_pagado, currency), WIDTH / 2, y)

  // Detalle
  y += 28
  ctx.textAlign = 'left'
  for (const line of contentLines) {
    y += 20
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px Helvetica, Arial, sans-serif'
    ctx.fillText(line.label, MARGIN, y)
    y += 16
    ctx.fillStyle = '#111827'
    ctx.font = '13px Helvetica, Arial, sans-serif'
    ctx.fillText(line.value, MARGIN, y)
  }

  // Pie
  y += 32
  ctx.strokeStyle = '#e5e7eb'
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(WIDTH - MARGIN, y)
  ctx.stroke()

  y += 20
  ctx.fillStyle = '#9ca3af'
  ctx.font = '9px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Generado por ${companyName}`, WIDTH / 2, y)

  const filename = `Recibo_Cuota${cuotaPago.numero_cuota}_${cliente.nombre.replace(/\s+/g, '_')}_${nRecibo}.png`

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename)
  }, 'image/png')
}
