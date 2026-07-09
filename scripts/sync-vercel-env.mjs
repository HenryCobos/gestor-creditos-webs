#!/usr/bin/env node
/**
 * Sincroniza variables de entorno críticas a Vercel Production.
 *
 * Requisitos:
 *   npx vercel login
 *   npx vercel link   (en la raíz del proyecto)
 *
 * Uso:
 *   node scripts/sync-vercel-env.mjs              # dry-run
 *   node scripts/sync-vercel-env.mjs --push       # aplicar en Vercel
 *   node scripts/sync-vercel-env.mjs --audit      # auditar nombres requeridos
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PRODUCTION_APP_URL = 'https://gestor-creditos-webs.vercel.app'

/** Variables que el código usa — nombres EXACTOS */
export const REQUIRED_ENV = {
  core: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ],
  conversion: ['HOTMART_WEBHOOK_SECRET'],
  email: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET'],
  analytics: [
    'NEXT_PUBLIC_GTM_ID',
    'NEXT_PUBLIC_GA_MEASUREMENT_ID',
    'NEXT_PUBLIC_GOOGLE_ADS_ID',
    'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP',
    'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE',
    'TIKTOK_PIXEL_ID',
    'TIKTOK_ACCESS_TOKEN',
  ],
}

/** Valores fijos de producción (no secretos) */
const PRODUCTION_OVERRIDES = {
  RESEND_FROM_EMAIL: 'Henry - Gestor de Créditos <hola@ingresosonlinehoy.com>',
  NEXT_PUBLIC_APP_URL: PRODUCTION_APP_URL,
}

const SYNC_KEYS = [
  'RESEND_FROM_EMAIL',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'HOTMART_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL',
]

/** Solo se sincronizan si existen en .env.local (evita sobrescribir con vacío) */
const OPTIONAL_SYNC_KEYS = ['TIKTOK_PIXEL_ID', 'TIKTOK_ACCESS_TOKEN']

function loadEnvLocal() {
  const env = {}
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
      env[key] = val
    }
  } catch {
    console.error('No se encontró .env.local — copia .env.example y completa los valores.')
    process.exit(1)
  }
  return env
}

function buildSyncValues(localEnv) {
  const values = {}
  const keys = [...SYNC_KEYS, ...OPTIONAL_SYNC_KEYS.filter((k) => localEnv[k])]
  for (const key of keys) {
    values[key] = PRODUCTION_OVERRIDES[key] ?? localEnv[key]
  }
  return values
}

function runVercel(args, input) {
  const result = spawnSync('npx', ['vercel', ...args], {
    cwd: ROOT,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return result
}

function vercelEnvExists(name, environment = 'production') {
  const result = runVercel(['env', 'ls', environment], undefined)
  if (result.status !== 0) return null
  return result.stdout.includes(name)
}

function upsertVercelEnv(name, value, environment = 'production') {
  const exists = vercelEnvExists(name, environment)
  if (exists) {
    runVercel(['env', 'rm', name, environment, '--yes'], undefined)
  }
  const result = runVercel(['env', 'add', name, environment], value)
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to set ${name}`)
  }
  return exists ? 'updated' : 'created'
}

function audit() {
  console.log('=== Auditoría de nombres de variables ===\n')
  const all = Object.values(REQUIRED_ENV).flat()
  for (const key of all) {
    console.log(`  ✓ ${key}`)
  }
  console.log('\nGoogle Ads — nombres EXACTOS requeridos por lib/analytics.ts:')
  console.log('  NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SIGNUP')
  console.log('  NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PURCHASE')
  console.log('\nTikTok Events API — nombres EXACTOS requeridos por lib/tiktok-events-api.ts:')
  console.log('  TIKTOK_PIXEL_ID')
  console.log('  TIKTOK_ACCESS_TOKEN')
  console.log('\n  (NO uses NVERSION ni mail.ingresosonlinehoy.com en RESEND_FROM_EMAIL)')
  console.log(`\nNEXT_PUBLIC_APP_URL en Production debe ser:\n  ${PRODUCTION_APP_URL}`)
}

function main() {
  const args = process.argv.slice(2)
  const shouldPush = args.includes('--push')
  const shouldAudit = args.includes('--audit') || args.length === 0

  if (shouldAudit && !shouldPush) {
    audit()
    console.log('\n--- Valores a sincronizar (desde .env.local + overrides) ---\n')
  }

  const localEnv = loadEnvLocal()
  const values = buildSyncValues(localEnv)

  const missing = SYNC_KEYS.filter((k) => !values[k] && !PRODUCTION_OVERRIDES[k])
  if (missing.length) {
    console.error('Faltan en .env.local:', missing.join(', '))
    process.exit(1)
  }

  for (const [key, val] of Object.entries(values)) {
    const display =
      key.includes('SECRET') || key.includes('KEY')
        ? `[${val.length} chars]`
        : val
    console.log(`  ${key} = ${display}`)
  }

  if (!shouldPush) {
    console.log('\nDry-run. Para aplicar en Vercel Production:')
    console.log('  npx vercel login && npx vercel link')
    console.log('  node scripts/sync-vercel-env.mjs --push')
    return
  }

  console.log('\n=== Sincronizando a Vercel Production ===\n')
  const whoami = runVercel(['whoami'], undefined)
  if (whoami.status !== 0) {
    console.error('Ejecuta primero: npx vercel login')
    process.exit(1)
  }
  console.log(`Vercel: ${whoami.stdout.trim()}`)

  for (const [key, val] of Object.entries(values)) {
    try {
      const action = upsertVercelEnv(key, val, 'production')
      console.log(`  ${action}: ${key}`)
    } catch (err) {
      console.error(`  ERROR ${key}:`, err.message)
      process.exit(1)
    }
  }

  console.log('\n✅ Variables sincronizadas. Redeploy:')
  console.log('  npx vercel --prod')
  console.log('\nPrueba email local:')
  console.log('  node scripts/setup-resend-mail-domain.mjs --test tu@email.com')
}

main()
