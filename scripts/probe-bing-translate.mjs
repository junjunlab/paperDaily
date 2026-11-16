/**
 * 探测必应翻译的免密钥流程（GitHub 上 bing-translate-api 那一套）：
 * 1) GET https://www.bing.com/translator 拿 IG / IID / abuse key + cookie
 * 2) POST https://www.bing.com/ttranslatev3 拿译文
 * 这里只用 fetch，不依赖浏览器 cookie 容器，先验证纯 Node 能否跑通。
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

const main = async () => {
  const home = await fetch('https://www.bing.com/translator', {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
  })
  console.log('首页 status:', home.status)
  const cookie = (home.headers.getSetCookie ? home.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ')
  console.log('cookie 片段:', cookie.slice(0, 60) || '(空)')

  const html = await home.text()
  const ig = html.match(/IG:"([0-9A-Fa-f]+)"/)?.[1] || ''
  const iid = html.match(/data-iid="([^"]+)"/)?.[1] || 'translator.5028'
  const abuse = html.match(/params_AbusePreventionHelper\s*=\s*\[([0-9]+),"([^"]+)"/)
  console.log('IG:', ig ? ig.slice(0, 12) + '…' : '无', '| IID:', iid, '| abuse:', abuse ? '有' : '无')

  if (!ig || !abuse) {
    console.log('页面结构变了，拿不到参数')
    return
  }

  const key = abuse[1]
  const token = abuse[2]
  const body = new URLSearchParams({
    fromLang: 'en',
    to: 'zh-Hans',
    text: 'Single-cell transcriptomics reveals immune reprogramming in human liver fibrosis',
    token,
    key,
  })

  const res = await fetch(
    `https://www.bing.com/ttranslatev3?isVertical=1&IG=${ig}&IID=${iid}.1`,
    {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://www.bing.com/translator',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body.toString(),
    },
  )
  console.log('翻译 status:', res.status)
  const text = await res.text()
  console.log('返回:', text.slice(0, 300))
}

main().catch((e) => console.error('FAIL', e.message))
