/**
 * Cloudflare Worker — same contract as server.js:
 * Send request to the worker URL with header X-target-host: <origin>
 * Path, method, body, and other headers are forwarded to <origin><path>.
 */

const SKIP_HEADERS = new Set([
  'host',
  'x-target-host',
  'connection',
  'content-length',
  'transfer-encoding',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor'
])

function buildTargetUrl (requestUrl, targetOrigin) {
  const incoming = new URL(requestUrl)
  const base = targetOrigin.endsWith('/') ? targetOrigin : `${targetOrigin}/`
  return new URL(incoming.pathname + incoming.search, base)
}

function outboundHeaders (request) {
  const headers = new Headers()
  for (const [name, value] of request.headers) {
    const lower = name.toLowerCase()
    if (SKIP_HEADERS.has(lower)) continue
    if (lower.startsWith('cf-')) continue
    headers.set(name, value)
  }
  return headers
}

export default {
  async fetch (request) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'shipment-api-proxy' })
    }

    const targetOrigin = request.headers.get('x-target-host')
    if (!targetOrigin) {
      return new Response('Missing X-target-host header', { status: 400 })
    }

    let targetUrl
    try {
      targetUrl = buildTargetUrl(request.url, targetOrigin)
    } catch {
      return new Response('Invalid X-target-host', { status: 400 })
    }

    const method = request.method
    const hasBody = method !== 'GET' && method !== 'HEAD'

    try {
      return await fetch(targetUrl.href, {
        method,
        headers: outboundHeaders(request),
        body: hasBody ? request.body : undefined,
        redirect: 'follow'
      })
    } catch (err) {
      return new Response(err.message || 'Proxy error', { status: 502 })
    }
  }
}
