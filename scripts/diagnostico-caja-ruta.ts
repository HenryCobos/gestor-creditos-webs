/**
 * Diagnóstico y corrección de caja por ruta
 *
 * Uso:
 *   npx tsx scripts/diagnostico-caja-ruta.ts cristianfuchs10@gmail.com ANITA
 *   npx tsx scripts/diagnostico-caja-ruta.ts cristianfuchs10@gmail.com ANITA --apply
 */

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2] || 'cristianfuchs10@gmail.com'
const nombreRuta = process.argv[3] || 'ANITA'
const apply = process.argv.includes('--apply')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function rpcCapitalPendientePrestamo(prestamoId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('capital_pendiente_prestamo', {
    p_prestamo_id: prestamoId,
  })
  if (error) return null
  return Number(data) || 0
}

async function rpcCapitalPendienteRuta(rutaId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_capital_pendiente_ruta', {
    p_ruta_id: rutaId,
  })
  if (error) return null
  return Number(data) || 0
}

async function calcularCapitalManual(rutaId: string, capitalInicial: number) {
  const { data: movs } = await supabase
    .from('movimientos_capital_ruta')
    .select('tipo_movimiento, monto, concepto')
    .eq('ruta_id', rutaId)

  const manualNeto = (movs || []).reduce((s, m) => {
    const esCapitalInicial =
      m.tipo_movimiento === 'ingreso' &&
      (m.concepto || '').toLowerCase().startsWith('capital inicial')
    if (m.tipo_movimiento === 'ingreso' && !esCapitalInicial) return s + Number(m.monto)
    if (m.tipo_movimiento === 'transferencia_entrada') return s + Number(m.monto)
    if (m.tipo_movimiento === 'retiro' || m.tipo_movimiento === 'transferencia_salida') {
      return s - Number(m.monto)
    }
    return s
  }, 0)

  const { data: prestamosRuta } = await supabase
    .from('prestamos')
    .select('id, monto_prestado, estado')
    .eq('ruta_id', rutaId)

  const prestamoIds = (prestamosRuta || []).map((p) => p.id)
  const capitalPrestadoHistorico = (prestamosRuta || []).reduce(
    (s, p) => s + Number(p.monto_prestado),
    0
  )
  const capitalPrestadoActivos = (prestamosRuta || [])
    .filter((p) => p.estado === 'activo' || p.estado === 'pendiente')
    .reduce((s, p) => s + Number(p.monto_prestado), 0)

  let cobros = 0
  if (prestamoIds.length > 0) {
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto_pagado')
      .in('prestamo_id', prestamoIds)
    cobros = (pagos || []).reduce((s, p) => s + Number(p.monto_pagado), 0)
  }

  const { data: gastos } = await supabase
    .from('gastos')
    .select('monto')
    .eq('ruta_id', rutaId)
    .eq('aprobado', true)
  const totalGastos = (gastos || []).reduce((s, g) => s + Number(g.monto), 0)

  const capitalPendienteEnCalle = (await rpcCapitalPendienteRuta(rutaId)) ?? null

  const capitalContable =
    capitalInicial + manualNeto + cobros - capitalPrestadoHistorico - totalGastos

  const capitalFormulaPendiente =
    capitalInicial +
    manualNeto +
    cobros -
    (capitalPendienteEnCalle ?? capitalPrestadoActivos) -
    totalGastos

  return {
    capital_inicial: capitalInicial,
    manual_neto: manualNeto,
    cobros,
    capital_prestado_historico: capitalPrestadoHistorico,
    capital_prestado_activos: capitalPrestadoActivos,
    capital_pendiente_en_calle: capitalPendienteEnCalle,
    gastos: totalGastos,
    capital_contable: capitalContable,
    capital_formula_pendiente: capitalFormulaPendiente,
  }
}

async function main() {
  console.log('=== Diagnóstico caja por ruta ===')
  console.log(`Admin: ${email}`)
  console.log(`Ruta: ${nombreRuta}`)
  console.log(`Modo: ${apply ? 'APLICAR CAMBIOS' : 'solo lectura'}\n`)

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .eq('email', email)
    .single()

  if (profileErr || !profile?.organization_id) {
    console.error('❌ No se encontró perfil/org:', profileErr?.message)
    process.exit(1)
  }

  const orgId = profile.organization_id

  const { data: rutasOrg, error: rutasErr } = await supabase
    .from('rutas')
    .select('id, nombre_ruta, capital_inicial, capital_actual, estado')
    .eq('organization_id', orgId)

  if (rutasErr) {
    console.error('❌ Error cargando rutas:', rutasErr.message)
    process.exit(1)
  }

  console.log(`Rutas en org (${orgId}):`)
  rutasOrg?.forEach((r) =>
    console.log(`  - ${r.nombre_ruta} (${r.estado}) capital=${r.capital_actual}`)
  )

  const ruta =
    rutasOrg?.find((r) =>
      r.nombre_ruta.toLowerCase().includes(nombreRuta.toLowerCase())
    ) ?? null

  if (!ruta) {
    console.error(`❌ Ruta "${nombreRuta}" no encontrada en la org`)
    process.exit(1)
  }

  console.log('\n--- Ruta ---')
  console.log(JSON.stringify(ruta, null, 2))

  const capitalAntesBd = Number(ruta.capital_actual)
  const desglose = await calcularCapitalManual(ruta.id, Number(ruta.capital_inicial))

  console.log('\n--- Fórmula contable (correcta para capital_actual) ---')
  console.log(`capital_actual en BD:              ${capitalAntesBd}`)
  console.log(`capital contable recalculado:      ${desglose.capital_contable.toFixed(2)}`)
  console.log(
    `diferencia BD vs contable:         ${(capitalAntesBd - desglose.capital_contable).toFixed(2)}`
  )
  console.log('\nDesglose contable:')
  console.log(`  + capital_inicial:               ${desglose.capital_inicial}`)
  console.log(`  + manual neto:                   ${desglose.manual_neto}`)
  console.log(`  + cobros acumulados:             ${desglose.cobros}`)
  console.log(`  - capital prestado (histórico):  ${desglose.capital_prestado_historico}`)
  console.log(`  - gastos aprobados:              ${desglose.gastos}`)
  console.log(`  = capital_actual:                ${desglose.capital_contable.toFixed(2)}`)

  console.log('\n--- Métricas operativas (no usadas en saldo total) ---')
  console.log(
    `  capital pendiente en calle (RPC): ${desglose.capital_pendiente_en_calle ?? 'N/A'}`
  )
  console.log(`  monto_prestado solo activos:      ${desglose.capital_prestado_activos}`)
  console.log(
    `  fórmula errónea (pagos - pendiente): ${desglose.capital_formula_pendiente.toFixed(2)}`
  )

  if (Math.abs(capitalAntesBd - desglose.capital_contable) > 0.02) {
    console.log(
      '\n🚩 Flag: capital_actual en BD NO cuadra con fórmula contable. Ejecuta FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D1.sql + D2.sql'
    )
  } else {
    console.log('\n✅ capital_actual cuadra con fórmula contable')
  }

  const { data: prestamosActivos } = await supabase
    .from('prestamos')
    .select(
      'id, monto_prestado, monto_total, estado, fecha_inicio, updated_at, cliente_id, cliente:clientes(nombre)'
    )
    .eq('ruta_id', ruta.id)
    .in('estado', ['activo', 'pendiente'])
    .order('created_at', { ascending: true })

  console.log('\n--- Préstamos activos/pendientes en ruta (capital pendiente) ---')
  let sumPendiente = 0
  let sumPrestado = 0
  for (const p of prestamosActivos || []) {
    const cliente = (p.cliente as { nombre?: string } | null)?.nombre || '?'
    const pendiente = (await rpcCapitalPendientePrestamo(p.id)) ?? Number(p.monto_prestado)
    sumPendiente += pendiente
    sumPrestado += Number(p.monto_prestado)
    console.log(
      `  ${cliente} | prestado ${p.monto_prestado} | pendiente ${pendiente.toFixed(2)} | estado ${p.estado}`
    )
  }
  console.log(`Suma monto_prestado: ${sumPrestado} | Suma capital_pendiente: ${sumPendiente.toFixed(2)}`)

  const hace7Dias = new Date()
  hace7Dias.setDate(hace7Dias.getDate() - 7)
  const { data: pagadosRecientes } = await supabase
    .from('prestamos')
    .select(
      'id, monto_prestado, estado, updated_at, cliente:clientes(nombre)'
    )
    .eq('ruta_id', ruta.id)
    .eq('estado', 'pagado')
    .gte('updated_at', hace7Dias.toISOString())

  const sumPagadosRecientes = (pagadosRecientes || []).reduce(
    (s, p) => s + Number(p.monto_prestado),
    0
  )
  const diffCapital = desglose.capital_contable - capitalAntesBd

  console.log('\n--- Préstamos pagados recientes (últimos 7 días) ---')
  for (const p of pagadosRecientes || []) {
    const cliente = (p.cliente as { nombre?: string } | null)?.nombre || '?'
    console.log(
      `  ${cliente} | monto_prestado ${p.monto_prestado} | updated ${p.updated_at?.slice(0, 10)}`
    )
  }
  console.log(`Suma monto_prestado pagados recientes: ${sumPagadosRecientes}`)

  if (Math.abs(diffCapital + sumPagadosRecientes) < 50 && sumPagadosRecientes > 0) {
    console.log(
      `\n🚩 Flag: diferencia de capital (~${diffCapital.toFixed(0)}) ≈ suma préstamos pagados recientes (~${sumPagadosRecientes}) — posible doble conteo corregido`
    )
  }

  const { data: movs } = await supabase
    .from('movimientos_capital_ruta')
    .select('id, tipo_movimiento, monto, concepto, fecha_movimiento')
    .eq('ruta_id', ruta.id)
  console.log(`\nMovimientos capital: ${movs?.length ?? 0}`)

  const { data: orgUserIds } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)
  const userIds = (orgUserIds || []).map((u) => u.id)

  const { data: prestamosOrgSinRuta } = await supabase
    .from('prestamos')
    .select('id, monto_prestado, ruta_id, cliente_id')
    .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
    .in('estado', ['activo', 'pendiente'])
    .is('ruta_id', null)

  const { data: clientesRuta } = await supabase
    .from('ruta_clientes')
    .select('cliente_id')
    .eq('ruta_id', ruta.id)
    .eq('activo', true)
  const clienteIds = (clientesRuta || []).map((c) => c.cliente_id)

  const huérfanosEnRuta = (prestamosOrgSinRuta || []).filter((p) =>
    clienteIds.includes(p.cliente_id)
  )
  const sumHuérfanos = huérfanosEnRuta.reduce((s, p) => s + Number(p.monto_prestado), 0)
  console.log(
    `\nPréstamos sin ruta_id pero cliente en ${nombreRuta}: ${huérfanosEnRuta.length} | Suma: ${sumHuérfanos}`
  )

  if (!apply) {
    console.log('\n⚠️  Modo lectura. Ejecuta con --apply para backfill y recalcular capital.')
    if (Math.abs(desglose.capital_contable - capitalAntesBd) > 0.01) {
      console.log(
        `\n💡 Tras D1+D2 en Supabase, capital_actual debería pasar de ${capitalAntesBd} → ~${desglose.capital_contable.toFixed(2)}`
      )
    }
    return
  }

  if (huérfanosEnRuta.length > 0) {
    console.log('\n--- Aplicando backfill ruta_id ---')
    for (const p of huérfanosEnRuta) {
      const { error } = await supabase
        .from('prestamos')
        .update({ ruta_id: ruta.id, updated_at: new Date().toISOString() })
        .eq('id', p.id)
      if (error) console.error(`❌ Error actualizando ${p.id}:`, error.message)
      else console.log(`✅ préstamo ${p.id} -> ruta ${ruta.id}`)
    }
  }

  console.log('\n--- Recalculando capital (RPC) ---')
  const { data: nuevoCapital, error: rpcErr } = await supabase.rpc(
    'recalcular_capital_ruta',
    { p_ruta_id: ruta.id }
  )

  if (rpcErr) {
    console.error('❌ recalcular_capital_ruta:', rpcErr.message)
    console.log('¿Ejecutaste FIX_CAPITAL_CAJA_FORMULA_CORRECTA_D1.sql en Supabase?')
  } else {
    console.log(`✅ Nuevo capital_actual: ${nuevoCapital}`)
    console.log(`   Antes: ${capitalAntesBd} → Después: ${nuevoCapital}`)
  }

  const { data: rutaFinal } = await supabase
    .from('rutas')
    .select('capital_inicial, capital_actual')
    .eq('id', ruta.id)
    .single()

  console.log('\n--- Estado final ---')
  console.log(JSON.stringify(rutaFinal, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
