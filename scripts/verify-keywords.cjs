/**
 * 验收：收藏页关键词订阅 —— 添加词 → 当日推荐 → 落盘 → 删除词。
 * 用法：node scripts/verify-keywords.cjs
 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: { width: 430, height: 932 },
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 180)))

  const body = () => page.evaluate(() => document.body.innerText)
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

  await page.goto('http://127.0.0.1:8082?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(7000)

  console.log('[1 切收藏]', await click('收藏', true))
  await sleep(1200)
  const before = await body()
  console.log('[2 订阅卡]', before.includes('关键词订阅'), '| 空提示:', before.includes('添加关键词后'))

  const input = await page.$('input[placeholder*="lung cancer"]')
  if (!input) {
    console.log('找不到输入框')
    await browser.close()
    return
  }
  await input.type('lung cancer')
  await sleep(300)
  console.log('[3 点添加]', await click('添加'))
  await sleep(1000)
  console.log('[4 关键词已存]', await page.evaluate(() => localStorage.getItem('pd.keywords')))

  let ready = false
  for (let i = 0; i < 90; i += 1) {
    const s = await body()
    const loading = s.includes('正在找相关新文')
    if (!loading && (s.includes('今日关键词推荐') || s.includes('今天还没找到'))) {
      ready = true
      break
    }
    await sleep(1000)
  }
  const after = await body()
  const feedRaw = await page.evaluate(() => localStorage.getItem('pd.kwFeed'))
  const feedCount = feedRaw ? (JSON.parse(feedRaw).papers || []).length : 0
  console.log('[5 当日推荐出现]', ready, '| 缓存条数:', feedCount)
  console.log('[6 推荐标题片段]', after.split('\n').filter((l) => l.length > 30).slice(0, 3).join(' | ').slice(0, 260))

  let firstZh = ''
  for (let i = 0; i < 80; i += 1) {
    firstZh = await page.evaluate(() => {
      const feed = JSON.parse(localStorage.getItem('pd.kwFeed') || '{}').papers || []
      const zh = JSON.parse(localStorage.getItem('pd.zh') || '{}')
      return feed[0] ? zh[feed[0].doi] || '' : ''
    })
    if (firstZh) break
    await sleep(1000)
  }
  console.log('[6b 首条推荐译文]', firstZh.slice(0, 90) || '(未翻出)')
  await page.screenshot({ path: 'C:/tmp/keywords-feed.png' })

  console.log('[7 选综述]', await click('综述'))
  let kindOk = false
  for (let i = 0; i < 80; i += 1) {
    const st = await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('pd.kwFeed') || '{}')
      const bad = (c.papers || []).filter((p) => !/review|overview|state of the art|progress/i.test(p.title || '') && p.type !== 'review').length
      return { kind: c.kind, n: (c.papers || []).length, bad }
    })
    if (st.kind === 'review' && st.n > 0 && st.bad === 0) {
      kindOk = true
      break
    }
    await sleep(1000)
  }
  console.log('[8 类型过滤生效]', kindOk, '| 落盘类型:', await page.evaluate(() => localStorage.getItem('pd.kwKind')))
  await page.screenshot({ path: 'C:/tmp/keywords-review.png' })

  console.log('[9 点词删除]', await click('lung cancer'))
  await sleep(1200)
  const removed = await body()
  console.log('[10 词已删除]', !removed.includes('lung cancer'), '| 推荐区消失:', !removed.includes('今日关键词推荐'))
  await page.screenshot({ path: 'C:/tmp/keywords-empty.png' })

  await browser.close()
})()
