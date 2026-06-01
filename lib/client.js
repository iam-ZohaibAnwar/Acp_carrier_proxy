'use strict'

/**
 * @param {boolean} isProxyEnabled
 * @param {object} options
 * @param {string} proxyHost - e.g. "http://localhost:4500", Render URL, or Cloudflare Worker URL (https)
 */
function proxyRequest (isProxyEnabled, options, proxyHost) {
  if (!isProxyEnabled) return options

  const urlObject = new URL(options.uri || options.url)
  const targetHost = urlObject.origin

  const proxy = new URL(proxyHost)
  urlObject.protocol = proxy.protocol
  urlObject.host = proxy.host

  let href = urlObject.href
  if (proxy.protocol === 'http:') {
    href = href.replace('https:', 'http:')
  }

  options.uri = href
  options.url = href

  if (!options.headers) options.headers = {}
  options.headers['X-target-host'] = targetHost

  return options
}

module.exports = { proxyRequest }
