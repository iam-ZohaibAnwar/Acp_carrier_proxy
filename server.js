'use strict'

const express = require('express')
const axios = require('axios')

const PORT = Number(process.env.PORT) || 4500

const app = express()
app.disable('x-powered-by')
app.use(express.raw({ type: () => true, limit: '10mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.all('*', async (req, res) => {
  const targetOrigin = req.get('x-target-host')
  if (!targetOrigin) {
    return res.status(400).send('Missing X-target-host header')
  }

  let targetUrl
  try {
    const base = targetOrigin.endsWith('/') ? targetOrigin : `${targetOrigin}/`
    targetUrl = new URL(req.originalUrl, base)
  } catch {
    return res.status(400).send('Invalid X-target-host')
  }

  const headers = { ...req.headers }
  delete headers.host
  delete headers['x-target-host']
  delete headers['content-length']

  try {
    console.log(targetUrl.href)
    const upstream = await axios({
      method: req.method,
      url: targetUrl.href,
      headers,
      data: req.body?.length ? req.body : undefined,
      responseType: 'arraybuffer',
      validateStatus: () => true,
      maxRedirects: 5
    })

    res.status(upstream.status)
    for (const [name, value] of Object.entries(upstream.headers)) {
      if (['transfer-encoding', 'connection'].includes(name.toLowerCase())) continue
      res.set(name, value)
    }
    res.send(upstream.data)
  } catch (err) {
    res.status(502).send(err.message || 'Proxy error')
  }
})

app.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`)
})
