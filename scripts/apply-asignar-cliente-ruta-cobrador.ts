/**
 * Verifica RPC asignar_cliente_a_ruta_cobrador y ejecuta backfill de clientes del cobrador.
 *
 * Requisito: ejecutar primero supabase/FIX_ASIGNAR_CLIENTE_RUTA_COBRADOR.sql (sección función)
 * en Supabase SQL Editor.
 *
 * Uso:
 *   npx tsx scripts/apply-asignar-cliente-ruta-cobrador.ts --apply
 *   npx tsx scripts/apply-asignar-cliente-ruta-cobrador.ts --apply --email anita@example.com
 */

import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const emailArg = process.argv.find((a) => a.startsWith('--email='))
const emailFilter = emailArg?.split('=')[1]

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('=== Auto-asignar clientes cobrador → ruta ===')
  console.log(`Modo: ${apply ? 'APLICAR' : 'solo lectura'}\n`)

  // Verificar que existe la RPC
  const { error: rpcProbeErr } = await supabase.rpc('asignar_cliente_a_ruta_cobrador', {
    p_cliente_id: '00000000-0000-0000-0000-000000000000',
    p_ruta_id: null,
  })

  if (rpcProbeErr?.message?.includes('Could not find the function')) {
    console.error(
      '❌ La función asignar_cliente_a_ruta_cobrador no existe.\n' +
        '   Ejecuta supabase/FIX_ASIGNAR_CLIENTE_RUTA_COBRADOR.sql en Supabase SQL Editor.'
    )
    process.exit(1)
  }
  console.log('✓ RPC asignar_cliente_a_ruta_cobrador disponible\n')

  const { data: candidatos, error } = await supabase
    .from('clientes')
    .select('id, nombre, user_id')

  if (error) {
    console.error('❌ Error listando clientes:', error.message)
    process.exit(1)
  }

  let cobradorFilterId: string | undefined
  if (emailFilter) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailFilter)
      .single()
    if (!profile) {
      console.error('❌ Cobrador no encontrado:', emailFilter)
      process.exit(1)
    }
    cobradorFilterId = profile.id
  }

  const { data: rutas } = await supabase
    .from('rutas')
    .select('id, nombre_ruta, cobrador_id, estado')
    .eq('estado', 'activa')

  const rutasPorCobrador = new Map<string, { id: string; nombre_ruta: string }[]>()
  for (const r of rutas || []) {
    if (!r.cobrador_id) continue
    const list = rutasPorCobrador.get(r.cobrador_id) || []
    list.push({ id: r.id, nombre_ruta: r.nombre_ruta })
    rutasPorCobrador.set(r.cobrador_id, list)
  }

  const { data: asignaciones } = await supabase
    .from('ruta_clientes')
    .select('cliente_id, ruta_id, activo')
    .eq('activo', true)

  const asignado = new Set(
    (asignaciones || []).map((a) => `${a.ruta_id}:${a.cliente_id}`)
  )

  const pendientes: { clienteId: string; nombre: string; rutaId: string; rutaNombre: string }[] =
    []

  for (const c of candidatos || []) {
    if (!c.user_id) continue
    if (cobradorFilterId && c.user_id !== cobradorFilterId) continue
    const rutasCob = rutasPorCobrador.get(c.user_id)
    if (!rutasCob?.length) continue
    const ruta = rutasCob[0]
    if (!asignado.has(`${ruta.id}:${c.id}`)) {
      pendientes.push({
        clienteId: c.id,
        nombre: c.nombre,
        rutaId: ruta.id,
        rutaNombre: ruta.nombre_ruta,
      })
    }
  }

  console.log(`Clientes creados por cobrador sin ruta_clientes: ${pendientes.length}`)
  for (const p of pendientes.slice(0, 20)) {
    console.log(`  - ${p.nombre} → ${p.rutaNombre}`)
  }
  if (pendientes.length > 20) {
    console.log(`  ... y ${pendientes.length - 20} más`)
  }

  if (!apply) {
    console.log('\nEjecuta con --apply para vincular vía RPC (como lo haría el cobrador).')
    return
  }

  let ok = 0
  let fail = 0
  const rutasAfectadas = new Set<string>()

  for (const p of pendientes) {
    const { data, error: rpcErr } = await supabase.rpc('asignar_cliente_a_ruta_cobrador', {
      p_cliente_id: p.clienteId,
      p_ruta_id: p.rutaId,
    })
    if (rpcErr) {
      console.error(`  ✗ ${p.nombre}:`, rpcErr.message)
      fail++
    } else {
      ok++
      if (data) rutasAfectadas.add(data as string)
    }
  }

  for (const rutaId of rutasAfectadas) {
    await supabase.rpc('recalcular_capital_ruta', { p_ruta_id: rutaId })
  }

  console.log(`\n✓ Vinculados: ${ok}, errores: ${fail}`)
  if (rutasAfectadas.size) {
    console.log(`✓ Capital recalculado en ${rutasAfectadas.size} ruta(s)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
