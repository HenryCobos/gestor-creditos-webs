# Guía — Campaña TikTok Sales (app → web)

Usa audiencias de la app móvil (mismo Business Center) para convertir prestamistas en suscriptores web.

## Prerrequisitos

Antes de lanzar la campaña Sales optimizada a **CompletePayment**:

1. ✅ `TIKTOK_PIXEL_ID` y `TIKTOK_ACCESS_TOKEN` configurados en Vercel
2. ✅ Webhook Hotmart enviando `CompletePayment` server-side
3. ✅ Tags GTM actualizados (ver `GUIA-GTM-TIKTOK.md`)
4. ⏳ **50+ eventos CompletePayment** visibles en TikTok Events Manager (7–14 días post-deploy)

## Estructura de campaña

**Objetivo:** Website Conversions → optimizar **CompletePayment**

**Presupuesto sugerido inicial:** $30–80 USD/día (ajustar según CPA)

| Ad Group | Audiencia | Creativo | Budget |
|----------|-----------|----------|--------|
| **AG1 Retargeting caliente** | LAL 1% app purchasers + app installers 30d | "Gestiona desde PC — mismo negocio, más capacidad" | 40% |
| **AG2 Retargeting tibio** | Web CompleteRegistration 14d sin Purchase | Testimonial + demo dashboard | 25% |
| **AG3 Prospección LAL** | LAL 1–3% app purchasers | Video UGC prestamista + pantalla web | 35% |

## Exclusiones

- Usuarios web con plan de pago activo (si exportas lista de emails)
- App users que ya compraron web (evitar overlap)
- Audiencias de competidores o irrelevantes

## Creativos recomendados (app → web)

1. **Split screen:** app móvil + dashboard web — "Mismo control, pantalla grande"
2. **Pain point:** "¿Sigues llevando todo en cuaderno/Excel?" → web con PDFs y 200 clientes
3. **Social proof:** testimonio de prestamista (upgrade page)
4. **CTA:** "Prueba 7 días Business gratis"

## KPIs objetivo (referencia SaaS LATAM prestamistas)

| Métrica | Objetivo inicial |
|---------|------------------|
| CPA Purchase Pro ($19) | $15–35 USD |
| CPA Purchase Business ($49) | $40–80 USD |
| ROAS | > 2x en 30 días |
| Registro → Purchase | 5–15% (con retargeting app audience) |

## Escalamiento

1. Semana 1–2: solo AG1 (retargeting caliente) — validar CPA
2. Semana 3: activar AG2 si CompleteRegistration tiene volumen
3. Semana 4+: escalar AG3 LAL de 1% → 3% si ROAS > 2x

## Qué NO hacer

- ❌ Campaña Sales optimizada a CompleteRegistration (trae registros gratis, no pagos)
- ❌ Prospección fría antes de tener Purchase tracking server-side funcionando
- ❌ Duplicar pixel app/web sin Events API (pierdes ventas off-site en Hotmart)

## Checklist de lanzamiento

- [ ] 50+ eventos CompletePayment en Events Manager
- [ ] EMQ > 4 (email hasheado en server-side y GTM)
- [ ] Creativos subidos (3–5 variantes por ad group)
- [ ] Pixel web "Web Eventos Gestor de Creditos" seleccionado
- [ ] Conversion event = CompletePayment
- [ ] Exclusiones configuradas
- [ ] Presupuesto diario y bid strategy (Cost Cap o Lowest Cost según CPA histórico)

## Monitoreo post-lanzamiento

- Events Manager → CompletePayment count diario
- TikTok Ads → CPA por ad group cada 48h
- Comparar server-side vs browser Purchase (server = fuente de verdad)
- Pausar creativos con CPA > 2x objetivo después de 1000 impresiones
