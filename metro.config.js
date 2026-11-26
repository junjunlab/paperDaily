const { getDefaultConfig } = require('expo/metro-config')
const { execFile } = require('child_process')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

/**
 * Web 预览专用的翻译代理。翻译接口不给 CORS 头，浏览器里直接 fetch 会失败；
 * 原生 App 没这问题，打包后走直连，不受这里影响。仅开发服务器生效。
 *
 * 这里用 curl 而不是 Node fetch：本机可能注入了失效的代理环境变量，
 * curl 可以显式指定可用代理（PD_WEB_PROXY，默认本机 7892），失败再试直连。
 */
const TARGETS = {
  '/__tx': { method: 'POST', url: 'https://transmart.qq.com/api/imt' },
  '/__gt': { method: 'GET', url: 'https://clients5.google.com/translate_a/t' },
}
const PROXY = process.env.PD_WEB_PROXY || 'http://127.0.0.1:7892'
const CURL = process.platform === 'win32' ? 'curl.exe' : 'curl'

function runCurl(args) {
  return new Promise((resolve, reject) => {
    execFile(CURL, args, { maxBuffer: 8_000_000, timeout: 12_000 }, (err, stdout, stderr) => {
      if (err && !stdout) return reject(err || new Error(stderr || 'curl failed'))
      resolve(stdout)
    })
  })
}

async function fetchText(url, method, body) {
  const common = ['-sS', '--max-time', '10', '-H', 'Content-Type: application/json', '-w', '\n%{http_code}']
  if (method === 'POST') common.push('-X', 'POST', '--data-binary', body)
  for (const useProxy of [true, false]) {
    try {
      const out = await runCurl([...common, ...(useProxy && PROXY ? ['-x', PROXY] : []), url])
      const i = out.lastIndexOf('\n')
      const status = Number(out.slice(i + 1).trim())
      if (status >= 200 && status < 300) return { status, text: out.slice(0, i) }
      if (!useProxy) return { status: status || 502, text: out.slice(0, i) }
    } catch {
      if (!useProxy) throw new Error('translation relay failed')
    }
  }
  throw new Error('translation relay failed')
}

async function relay(target, req, res) {
  let body = ''
  if (target.method === 'POST') {
    req.on('data', (c) => {
      body += c
      if (body.length > 2_000_000) req.destroy()
    })
    await new Promise((resolve, reject) => {
      req.on('end', resolve)
      req.on('error', reject)
    })
  }
  const query = target.method === 'GET' ? (req.url || '').split('?').slice(1).join('?') : ''
  const url = target.url + (query ? '?' + query : '')
  const out = await fetchText(url, target.method, body)
  res.statusCode = out.status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(out.text)
}

const orig = config.server.enhanceMiddleware
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const next = orig ? orig(middleware, metroServer) : middleware
  return (req, res, nextFn) => {
    const path = req.url ? req.url.split('?')[0] : ''
    const target = TARGETS[path]
    if (target && req.method === target.method) {
      void relay(target, req, res).catch((e) => {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: String(e && e.message) }))
      })
      return
    }
    return next(req, res, nextFn)
  }
}

module.exports = config
