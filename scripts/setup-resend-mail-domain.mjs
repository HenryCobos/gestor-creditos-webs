#!/usr/bin/env node
/**
 * Configura mail.ingresosonlinehoy.com en Resend para el drip email.
 * La app sigue en la URL de Vercel (NEXT_PUBLIC_APP_URL) — solo cambia el remitente.
 *
 * Uso:
 *   node scripts/setup-resend-mail-domain.mjs
 *   node scripts/setup-resend-mail-domain.mjs --verify
 *   node scripts/setup-resend-mail-domain.mjs --test tu@email.com
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MAIL_DOMAIN = 'mail.ingresosonlinehoy.com'
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  'Henry - Gestor de Créditos <hola@mail.ingresosonlinehoy.com>'

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(ROOT, '.env.local'), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local opcional
  }
}

loadEnvLocal()

const API_KEY = process.env.RESEND_API_KEY
const args = process.argv.slice(2)
const shouldVerify = args.includes('--verify')
const testEmailIdx = args.indexOf('--test')
const testEmail = testEmailIdx !== -1 ? args[testEmailIdx + 1] : null

async function resendFetch(path, options = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`)
  }
  return data
}

function printHostingerInstructions(records) {
  console.log('\n=== Registros DNS para Hostinger ===')
  console.log('Hostinger → Dominios → ingresosonlinehoy.com → DNS / Zona DNS\n')
  console.log('Añade cada registro (copia valores EXACTOS de Resend):\n')

  for (const r of records || []) {
    const hostingerName = r.name.includes(MAIL_DOMAIN)
      ? r.name.replace(`.${MAIL_DOMAIN}`, '').replace(MAIL_DOMAIN, '@')
      : r.name

    console.log(`  Tipo:     ${r.type}`)
    console.log(`  Nombre:   ${hostingerName || r.name}`)
    console.log(`  Valor:    ${r.value}`)
    if (r.priority != null) console.log(`  Prioridad: ${r.priority}`)
    console.log(`  (${r.record || 'DNS'})`)
    console.log('')
  }

  console.log('Notas Hostinger:')
  console.log('  - Para subdominio mail, el "Nombre" suele ser solo la parte antes del dominio')
  console.log('    (ej. "send" o "resend._domainkey", según lo que muestre Resend).')
  console.log('  - NO añadas registros A/CNAME de mail hacia Vercel.')
  console.log('  - Tras guardar, espera 15–60 min y ejecuta: node scripts/setup-resend-mail-domain.mjs --verify\n')
}

async function findOrCreateDomain() {
  const list = await resendFetch('/domains')
  const existing = (list.data || []).find((d) => d.name === MAIL_DOMAIN)

  if (existing) {
    console.log(`Dominio ya existe en Resend: ${MAIL_DOMAIN} (${existing.id})`)
    console.log(`Estado: ${existing.status}`)
    const detail = await resendFetch(`/domains/${existing.id}`)
    return detail
  }

  console.log(`Creando dominio en Resend: ${MAIL_DOMAIN}...`)
  const created = await resendFetch('/domains', {
    method: 'POST',
    body: JSON.stringify({ name: MAIL_DOMAIN, region: 'us-east-1' }),
  })
  console.log(`Creado: ${created.id} — estado: ${created.status}`)
  return created
}

async function verifyDomain(domainId) {
  console.log('Iniciando verificación DNS...')
  await resendFetch(`/domains/${domainId}/verify`, { method: 'POST' })
  const detail = await resendFetch(`/domains/${domainId}`)
  console.log(`Estado tras verify: ${detail.status}`)
  for (const r of detail.records || []) {
    console.log(`  ${r.record} ${r.name} → ${r.status}`)
  }
  return detail
}

async function sendTestEmail(to) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://gestor-creditos-webs.vercel.app'

  const html = `
    <h2>Prueba — Gestor de Créditos</h2>
    <p>Si recibes esto, el remitente <strong>${FROM_EMAIL}</strong> funciona.</p>
    <p>Link a la app (debe ser tu URL de Vercel, NO ingresosonlinehoy.com):</p>
    <p><a href="${appUrl}/dashboard">${appUrl}/dashboard</a></p>
  `

  const result = await resendFetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Prueba drip — Gestor de Créditos',
      html,
    }),
  })
  console.log(`Email de prueba enviado a ${to} — id: ${result.id}`)
}

async function main() {
  console.log('=== Setup email: mail.ingresosonlinehoy.com ===\n')
  console.log(`Remitente configurado: ${FROM_EMAIL}`)
  console.log(
    `URL app (links en emails): ${process.env.NEXT_PUBLIC_APP_URL || '(configura NEXT_PUBLIC_APP_URL en Vercel)'}\n`
  )

  if (!API_KEY || API_KEY === 'your_resend_api_key_here') {
    console.error('ERROR: Configura RESEND_API_KEY en .env.local con tu key de Resend.')
    console.error('  https://resend.com/api-keys\n')
    console.error('Pasos manuales si prefieres la UI:')
    console.error('  1. Resend → Domains → Add → mail.ingresosonlinehoy.com')
    console.error('  2. Copia DNS → Hostinger → Verify en Resend')
    console.error('  3. Vercel env: RESEND_FROM_EMAIL=' + FROM_EMAIL)
    process.exit(1)
  }

  const domain = await findOrCreateDomain()
  printHostingerInstructions(domain.records)

  if (shouldVerify) {
    await verifyDomain(domain.id)
  } else if (domain.status !== 'verified') {
    console.log('Siguiente paso: añade los DNS en Hostinger, luego ejecuta:')
    console.log('  node scripts/setup-resend-mail-domain.mjs --verify\n')
  }

  if (testEmail) {
    if (domain.status !== 'verified') {
      console.warn('ADVERTENCIA: dominio aún no verificado; el envío puede fallar.')
    }
    await sendTestEmail(testEmail)
  }

  console.log('\n=== Variables para Vercel (Production) ===')
  console.log(`RESEND_FROM_EMAIL=${FROM_EMAIL}`)
  console.log('RESEND_API_KEY=<tu_api_key>')
  console.log('CRON_SECRET=<openssl rand -hex 32>')
  console.log('NEXT_PUBLIC_APP_URL=https://gestor-creditos-webs.vercel.app  ← URL Vercel, sin cambiar')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
