const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

/**
 * Web 预览专用的翻译代理。
 * transmart.qq.com 不给 CORS 头，浏览器里直接 fetch 会失败；原生 App 没这问题。
 * 这里让 Metro dev server 把 /__tx 的 POST 转发到腾讯，浏览器请求同源路径即可。
 * 仅开发服务器生效，不影响 expo export / 原生打包。
 */
const TX_URL = 'https://transmart.qq.com/api/imt'
const BASE = config.server?.baseUrl || 'http://localhost:8082'

const orig = config.server.enhanceMiddleware
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const next = orig ? orig(middleware, metroServer) : middleware
  return (req, res, nextFn) => {
    if (req.method === 'POST' && req.url && req.url.split('?')[0] === '/__tx') {
      let body = ''
      req.on('data', (c) => {
        body += c
        if (body.length > 2_000_000) req.destroy()
      })
      req.on('end', async () => {
        try {
          const r = await fetch(TX_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          })
          const text = await r.text()
          res.statusCode = r.status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(text)
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: String(e && e.message) }))
        }
      })
      return
    }
    return next(req, res, nextFn)
  }
}

module.exports = config
