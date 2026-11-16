/**
 * 验收：关注条 / 新文角标 / 每日精选 / 顶刊页星标
 * 说明：react-native-web 的 Pressable 只认真实指针事件，脚本里必须用 page.mouse.click，
 *       直接 dispatchEvent('click') 不会触发 onPress。
 * 用法：node scripts/verify-follow.cjs
 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SEED = [
  { issn: '0028-0836', name: 'Nature', abbr: 'Nature', impact: '48.5', domain: 'life', at: 1, seen: '2026-11-01' },
  { issn: '0092-8674', name: 'Cell', abbr: 'Cell', impact: '42.5', domain: 'life', at: 2, seen: '2026-11-01' },
  { issn: '0036-8075', name: 'Science', abbr: 'Science', impact: '44.7', domain: 'life', at: 3, seen: '2026-11-01' },
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
  const ls = (key) => page.evaluate((k) => localStorage.getItem(k), key)
  /** 文本节点去重后的个数：View + Text 会各带一份同样文本，按 /2 折算前先看看 */
  const countExact = (t) =>
    page.evaluate(
      (s) => Array.from(document.querySelectorAll('div,span')).filter((n) => (n.textContent || '').trim() === s).length,
      t,
    )
  const clickText = async (t, where = 'any') => {
    const box = await page.evaluate(
      (s, w) => {
        const hits = Array.from(document.querySelectorAll('div,span'))
          .filter((n) => (n.textContent || '').trim() === s)
          .map((n) => {
            const r = n.getBoundingClientRect()
            return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top }
          })
          .filter((p) => p.y > 0 && p.y < window.innerHeight)
        if (!hits.length) return null
        hits.sort((a, b) => a.top - b.top)
        return w === 'bottom' ? hits[hits.length - 1] : hits[0]
      },
      t,
      where,
    )
    if (!box) return false
    await page.mouse.click(box.x, box.y)
    return true
  }

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 120000 })
  await page.evaluate(() => localStorage.clear())
  await page.evaluate((seed) => localStorage.setItem('pd.follows', JSON.stringify(seed)), SEED)
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 })
  await sleep(30000)

  const body = await text()
  console.log('[1 精选卡]', body.includes('先读这三篇'), '| picks 落盘:', (await ls('pd.picks')) ? 'yes' : 'no')
  console.log('[2 关注条]', body.includes('我的关注'))
  console.log('[3 「新」标记节点数]', await countExact('新'), '(3 个角标 ×2 层)')
  await page.screenshot({ path: 'C:/tmp/follow-papers.png' })

  // 顶刊页
  console.log('[4 切顶刊]', await clickText('顶刊', 'bottom'))
  await sleep(14000)
  const issues = await text()
  console.log('[5 顶刊页]', issues.includes('三刊最新一期与封面'), '| ★ 节点数', await countExact('★'), '| 新标记', await countExact('新'))
  await page.screenshot({ path: 'C:/tmp/follow-issues.png' })

  // 点第一张卡的 ★：应只取消关注，不进入该期
  await page.evaluate(() => window.scrollTo(0, 0))
  const star = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div,span')).filter((n) => (n.textContent || '').trim() === '★')[0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (star) await page.mouse.click(star.x, star.y)
  await sleep(2000)
  const after = await text()
  console.log('[6 仍在顶刊页]', after.includes('三刊最新一期与封面'), '| ★ 剩', await countExact('★'))
  await page.screenshot({ path: 'C:/tmp/follow-issues-after.png' })

  await browser.close()
})()
