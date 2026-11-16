/** 批量探测：GitHub 上常见的免密钥翻译实例，哪个能通、是否允许跨域 */
const TEXT = 'Single-cell transcriptomics reveals immune reprogramming'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36'

const check = async (name, url, init = {}) => {
  try {
    const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) } })
    const body = await res.text()
    const cors = res.headers.get('access-control-allow-origin') || '-'
    let out = body.replace(/\s+/g, ' ').slice(0, 120)
    try {
      const j = JSON.parse(body)
      out = (j.translation || j.translatedText || j.translate || JSON.stringify(j)).slice(0, 120)
    } catch {}
    console.log(`${res.status} | cors=${cors} | ${name} | ${out}`)
  } catch (e) {
    console.log(`ERR | ${name} | ${String(e.message).slice(0, 70)}`)
  }
}

const main = async () => {
  const q = encodeURIComponent(TEXT)
  await check('lingva.ml', `https://lingva.ml/api/v1/en/zh/${q}`)
  await check('lingva.lunar.icu', `https://lingva.lunar.icu/api/v1/en/zh/${q}`)
  await check('lingva.garudalinux.org', `https://lingva.garudalinux.org/api/v1/en/zh/${q}`)
  await check('translate.plausibility.cloud', `https://translate.plausibility.cloud/api/v1/en/zh/${q}`)

  const post = (u) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: TEXT, source: 'en', target: 'zh', format: 'text' }),
  })
  await check('libretranslate.de', 'https://libretranslate.de/translate', post())
  await check('translate.terraprint.co', 'https://translate.terraprint.co/translate', post())
  await check('trans.zillyhuhn.com', 'https://trans.zillyhuhn.com/translate', post())
  await check('lt.vern.cc', 'https://lt.vern.cc/translate', post())
}

main()
