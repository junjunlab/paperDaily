/** 验收：顶刊页三种进入场景的耗时（冷启动 / 二次进入 / 缓存过期） */
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
  page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 200)))
  page.on('requestfailed', (r) => {
    const u = r.url()
    if (u.includes('crossref') || u.includes('springernature') || u.includes('els-cdn'))
      console.log('  请求失败:', u.slice(0, 90), r.failure() && r.failure().errorText)
  })

  const text = () => page.evaluate(() => document.body.innerText)

  const clickTab = (t) =>
    page.evaluate((x) => {
      const hit = Array.from(document.querySelectorAll('div,span,button,a'))
        .filter((n) => (n.textContent || '').trim() === x && n.children.length === 0)
        .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)
      if (!hit[0]) return false
      hit[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, t)

  /**
   * 点击后轮询：first = 第一张卡出期号的时间，all = 三张都出且不再有「加载中」的时间
   * （-1 表示超时）
   */
  const timeToVol = async (limit = 60000) => {
    const t0 = Date.now()
    let first = -1
    for (let i = 0; i < limit / 200; i += 1) {
      const body = await text()
      const vols = (body.match(/Vol [0-9.]+ · No\.[0-9]+/g) || []).length
      const busy = body.includes('加载中')
      if (first < 0 && vols >= 1) first = Date.now() - t0
      if (vols >= 3 && !busy) return { first, all: Date.now() - t0 }
      await sleep(200)
    }
    return { first, all: -1 }
  }

  // ---------------- A. 冷启动（没有任何缓存）
  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(3000)
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(1200) // 等 App 挂上、预取刚起步

  await clickTab('顶刊')
  const a = await timeToVol()
  console.log(`A 冷启动进顶刊: 第一张 ${a.first}ms，三张齐全 ${a.all}ms`)
  await page.screenshot({ path: 'C:/tmp/issues-cold.png' })

  // ---------------- B. 切走再切回（会话内存缓存）
  await clickTab('论文')
  await sleep(600)
  await clickTab('顶刊')
  const b = await timeToVol(15000)
  console.log(`B 切走再切回: 第一张 ${b.first}ms，三张齐全 ${b.all}ms`)

  // ---------------- C. 刷新页面（磁盘缓存仍在）后再进
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(1500)
  await clickTab('顶刊')
  const c = await timeToVol(30000)
  console.log(`C 刷新页面后进顶刊: 第一张 ${c.first}ms，三张齐全 ${c.all}ms`)

  // ---------------- D. 把缓存时间改成 8 小时前（过期），应「先出旧卡再静默刷新」
  await page.evaluate(() => {
    const raw = localStorage.getItem('pd.issues')
    if (!raw) return
    const j = JSON.parse(raw)
    j.at = Date.now() - 8 * 3600 * 1000
    localStorage.setItem('pd.issues', JSON.stringify(j))
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(1500)
  await clickTab('顶刊')
  const d = await timeToVol(60000)
  console.log(`D 缓存过期后进顶刊: 第一张 ${d.first}ms（旧卡秒出），三张齐全 ${d.all}ms`)
  await page.screenshot({ path: 'C:/tmp/issues-expired.png' })

  console.log('\n最终内容:')
  console.log((await text()).split('\n').filter(Boolean).slice(0, 16).join(' | '))

  await browser.close()
})()
