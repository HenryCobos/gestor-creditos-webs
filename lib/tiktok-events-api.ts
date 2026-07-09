import { createHash } from 'crypto'

const TIKTOK_EVENTS_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'

export type TikTokServerEvent =
  | 'CompletePayment'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'ViewContent'

export function hashTikTokEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  return createHash('sha256').update(normalized).digest('hex')
}

type SendTikTokEventParams = {
  event: TikTokServerEvent
  eventId: string
  email?: string | null
  value?: number
  currency?: string
  contentId?: string
  contentName?: string
  url?: string
}

export async function sendTikTokServerEvent(
  params: SendTikTokEventParams
): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env.TIKTOK_PIXEL_ID
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('[TikTok Events API] TIKTOK_PIXEL_ID o TIKTOK_ACCESS_TOKEN no configurados — evento omitido')
    return { ok: false, error: 'not_configured' }
  }

  const eventTime = Math.floor(Date.now() / 1000)

  const user: Record<string, string> = {}
  if (params.email) {
    user.email = hashTikTokEmail(params.email)
  }

  const properties: Record<string, unknown> = {}
  if (params.value != null) properties.value = params.value
  if (params.currency) properties.currency = params.currency
  if (params.contentId) {
    properties.contents = [
      {
        content_id: params.contentId,
        content_type: 'product',
        content_name: params.contentName || params.contentId,
      },
    ]
  }

  const payload = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [
      {
        event: params.event,
        event_time: eventTime,
        event_id: params.eventId,
        user: Object.keys(user).length ? user : undefined,
        properties: Object.keys(properties).length ? properties : undefined,
        page: params.url ? { url: params.url } : undefined,
      },
    ],
  }

  try {
    const res = await fetch(TIKTOK_EVENTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data.code !== 0) {
      console.error('[TikTok Events API] Error:', data.message || data, params.event)
      return { ok: false, error: data.message || `HTTP ${res.status}` }
    }

    console.log(`[TikTok Events API] ✅ ${params.event} enviado (${params.eventId})`)
    return { ok: true }
  } catch (err) {
    console.error('[TikTok Events API] Exception:', err)
    return { ok: false, error: String(err) }
  }
}

/** CompletePayment tras compra confirmada en Hotmart */
export async function trackTikTokPurchase(params: {
  transactionId: string
  email: string
  planSlug: string
  amount: number
  currency?: string
}) {
  return sendTikTokServerEvent({
    event: 'CompletePayment',
    eventId: `purchase_${params.transactionId}`,
    email: params.email,
    value: params.amount,
    currency: params.currency || 'USD',
    contentId: params.planSlug,
    contentName: `Plan ${params.planSlug}`,
    url: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/compra-exitosa`
      : undefined,
  })
}
