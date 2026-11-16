/**
 * 验收 2：看刊后水位线推进（新标记消失）+ 面板里点星标不会顺带切换期刊
 * 用法：node scripts/verify-seen.cjs
 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SEED = [
  { issn: '0028-0836', name: 'Nature', abbr: 'Nature', impact: '48.5', domain: 'life', at: 1, seen: '2026-11-01' },
  { issn: '0092-8674', name: 'Cell', abbr: 'Cell', impact: '42.5', domain: 'life', at: 2, seen: '2026-11-01' },
]

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

  const text = () => page.evaluate(() => document.body.innerText)
  const follows = async () => JSON.parse((await page.evaluate(() => localStorage.getItem('pd.follows'))) || '[]')
  const center = (fn) =>
    page.evaluate((src) => {
      // eslint-disable-next-line no-new-func
      const el = new Function('return (' + src + ')')()()
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (!r.width) return null
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }, fn.toString())

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 120000 })
  await page.evaluate(() => localStorage.clear())
  await page.evaluate((seed) => localStorage.setItem('pd.follows', JSON.stringify(seed)), SEED)
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 })
  await sleep(30000)

  console.log('[1 初始 follows.seen]', (await follows()).map((f) => `${f.abbr}:${f.seen}`).join(', '))

  // 点关注条上的 Nature chip → 应切到该刊并把 seen 推到最新
  const chip = await center(() => {
    const hits = Array.from(document.querySelectorAll('div,span'))
      .filter((n) => (n.textContent || '').trim() === 'Nature')
      .map((n) => n)
      .filter((n) => n.getBoundingClientRect().top < 400)
    return hits[0]
  })
  if (chip) await page.mouse.click(chip.x, chip.y)
  await sleep(20000)
  const after = await follows()
  console.log('[2 看完 Nature 后]', after.map((f) => `${f.abbr}:${f.seen}`).join(', '))
  console.log('[3 期刊条切到 Nature]', (await text()).includes('Nature'))
  await page.screenshot({ path: 'C:/tmp/seen-after.png' })

  // 打开期刊面板，点 Cell 那一行的 ★（已关注）→ 只取消关注，面板不应关闭
  const openBar = await center(() => {
    const hits = Array.from(document.querySelectorAll('div,span')).filter(
      (n) => (n.textContent || '').trim() === '搜索 / 切换',
    )
    return hits[0]
  })
  if (openBar) await page.mouse.click(openBar.x, openBar.y)
  await sleep(2000)
  const cellStar = await page.evaluate(() => {
    const stars = Array.from(document.querySelectorAll('div,span')).filter((n) => (n.textContent || '').trim() === '★')
    const el = stars.find((s) => {
      let p = s
      for (let i = 0; i < 6 && p; i += 1, p = p.parentElement) {
        if ((p.textContent || '').includes('0092-8674')) return true
      }
      return false
    })
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (cellStar) await page.mouse.click(cellStar.x, cellStar.y)
  await sleep(2500)
  const panelStill = (await text()).includes('选择期刊')
  const now = await follows()
  console.log('[4 点星标后面板仍开着]', panelStill, '| 现在关注:', now.map((f) => f.abbr).join(', ') || '无')
  await page.screenshot({ path: 'C:/tmp/seen-panel.png' })

  await browser.close()
})()
