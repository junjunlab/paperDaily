/**
 * 验收：关键词 + 文章类型选择跨刷新 / 跨天保留，并继续按该组合推荐。
 * 用法：node scripts/verify-keyword-persist.cjs
 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const DAY = () => new Date().toLocaleDateString('sv-SE')

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: { width: 430, height: 932 },
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)

  const click = async (text, last = false) => {
    const box = await page.evaluate(
      (t, useLast) => {
        const hits = Array.from(document.querySelectorAll('div,span,button'))
          .filter((n) => (n.textContent || '').trim() === t && !n.children.length)
          .map((n) => {
            const r = n.getBoundingClientRect()
            return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top }
          })
          .filter((b) => b.y > 0 && b.y < window.innerHeight)
          .sort((a, b) => a.top - b.top)
        if (!hits.length) return null
        return useLast ? hits[hits.length - 1] : hits[0]
      },
      text,
      last,
    )
    if (!box) return false
    await page.mouse.click(box.x, box.y)
    return true
  }
  const state = () =>
    page.evaluate(() => ({
      words: localStorage.getItem('pd.keywords'),
      kind: localStorage.getItem('pd.kwKind'),
      feed: JSON.parse(localStorage.getItem('pd.kwFeed') || '{}'),
      body: document.body.innerText,
    }))

  await page.goto('http://127.0.0.1:8082?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(7000)
  await click('收藏', true)
  await sleep(800)

  const input = await page.$('input[placeholder*="lung cancer"]')
  await input.type('lung cancer')
  await click('添加')
  await sleep(800)
  await click('研究论文')
  for (let i = 0; i < 80; i += 1) {
    const s = await state()
    if (s.feed.kind === 'research' && (s.feed.papers || []).length) break
    await sleep(1000)
  }
  const first = await state()
  console.log('[1 首次选择]', first.words, first.kind, '| 缓存', first.feed.day, first.feed.kind, (first.feed.papers || []).length, '篇')

  // 刷新页面（不清数据）：选择应恢复，推荐应直接出现
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(2500)
  await click('收藏', true)
  await sleep(2500)
  const again = await state()
  console.log('[2 刷新后保留]', '关键词', again.words === first.words, '| 类型', again.kind === first.kind, '| 推荐直出', again.body.includes('今日关键词推荐') && !again.body.includes('正在找相关新文'))

  // 模拟跨天：把缓存日期改成昨天，应重新抓当天推荐且保留选择
  await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('pd.kwFeed') || '{}')
    const d = new Date()
    d.setDate(d.getDate() - 1)
    c.day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('pd.kwFeed', JSON.stringify(c))
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(2500)
  await click('收藏', true)
  let next = null
  for (let i = 0; i < 80; i += 1) {
    next = await state()
    if (next.feed.day === DAY() && (next.feed.papers || []).length && next.feed.kind === 'research') break
    await sleep(1000)
  }
  console.log('[3 跨天继续]', '缓存日', next.feed.day, '| 今天', DAY(), '| 类型', next.feed.kind, '| 关键词', next.words, '| 条数', (next.feed.papers || []).length)
  await page.screenshot({ path: 'C:/tmp/keywords-persist.png' })

  await browser.close()
})()
