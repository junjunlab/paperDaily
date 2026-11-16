/** 诊断翻译链路：看请求有没有发出去、返回什么、控制台有没有报错 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

page.on('console', (m) => {
  const t = m.text()
  if (/error|fail|translate|mymemory/i.test(t)) console.log('[console]', t.slice(0, 200))
})
page.on('requestfailed', (r) => {
  if (/mymemory|translate/i.test(r.url())) console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText)
})
page.on('response', async (r) => {
  const u = r.url()
  if (/mymemory/i.test(u)) {
    let body = ''
    try {
      body = (await r.text()).slice(0, 160)
    } catch {}
    console.log('[mymemory]', r.status(), u.slice(0, 110), '|', body.replace(/\s+/g, ' '))
  }
})

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })

// 页面内直接打一次，验证 CORS 与配额
const direct = await page.evaluate(async () => {
  try {
    const u = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent('Graphene oxide membranes for ion sieving') + '&langpair=en%7Czh-CN'
    const r = await fetch(u)
    const j = await r.json()
    return { status: r.status, zh: j?.responseData?.translatedText, quota: j?.quotaFinished, rs: j?.responseStatus }
  } catch (e) {
    return { error: String(e && e.message) }
  }
})
console.log('页面内直连 MyMemory:', JSON.stringify(direct))

// 等待列表翻译完成（最长 40s）
for (let i = 0; i < 20; i += 1) {
  await wait(2000)
  const zhCount = await page.evaluate(() => {
    // 中文卡片会把中文标题排在最前，用字符范围粗判
    const texts = Array.from(document.querySelectorAll('div')).map((el) => (el.textContent || '').trim())
    return texts.filter((t) => t && t.length > 10 && /[\u4e00-\u9fa5]{4,}/.test(t) && !/生命科学|医学|药学|化学|物理|材料|计算机|地球|数学/.test(t)).length
  })
  console.log(`第 ${(i + 1) * 2}s 中文候选块:`, zhCount)
  if (zhCount > 3) break
}

await page.screenshot({ path: 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data/zh2-home.png' })
console.log('截图完成')
await browser.close()
