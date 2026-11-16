/** 验证：期刊面板 IF 显示（JCR2024）+ 统计页开发者卡 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = process.env.SHOT_OUT || 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 })
await wait(8000)

const tapText = async (text) => {
  const pt = await page.evaluate((text) => {
    const nodes = Array.from(document.querySelectorAll('div,span'))
    const hits = nodes.filter((el) => {
      const s = (el.textContent || '').trim()
      const r = el.getBoundingClientRect()
      return s === text && r.width > 2 && r.width < 260 && r.height > 8 && r.height < 60
    })
    hits.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)
    const el = hits[0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, text)
  if (!pt) return false
  await page.mouse.click(pt.x, pt.y)
  await wait(1200)
  return true
}

// 1) 期刊面板：gpb 带 IF
console.log('打开期刊面板:', await tapText('搜索 / 切换') ? '成功' : '失败')
await wait(1000)
const idx = await page.evaluate(() => {
  const arr = Array.from(document.querySelectorAll('input'))
  let best = -1
  arr.forEach((el, i) => { if ((el.placeholder || '').includes('NEJM')) best = i })
  return best
})
if (idx >= 0) {
  await page.evaluate((i) => Array.from(document.querySelectorAll('input'))[i]?.focus(), idx)
  await page.keyboard.type('gpb', { delay: 70 })
  await wait(2000)
  const txt = await page.evaluate(() => document.body.innerText || '')
  console.log('gpb 命中期刊:', txt.includes('Genomics Proteomics') ? '是' : '否')
  console.log('gpb IF 7.9 显示:', /7\.9/.test(txt) ? '是' : '否')
  await page.screenshot({ path: OUT + '/if-gpb.png' })
}
// 关闭面板
await page.keyboard.press('Escape')
await wait(500)
const xbtn = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div,span')).filter(e => (e.textContent||'').trim()==='×')
  const r = els[0]?.getBoundingClientRect()
  return r ? {x:r.x+r.width/2,y:r.y+r.height/2} : null
})
if (xbtn) { await page.mouse.click(xbtn.x, xbtn.y); await wait(800) }

// 2) 统计页开发者卡
console.log('切到统计:', await tapText('统计') ? '成功' : '失败')
await wait(2000)
const t = await page.evaluate(() => document.body.innerText || '')
console.log('开发者卡「开发者」:', t.includes('开发者') ? '有' : '无')
console.log('GitHub 地址:', t.includes('github.com/junjunlab') ? '有' : '无')
console.log('--- 统计页文本 ---')
console.log(t.split('\n').filter(l=>l.trim()).slice(0,25).join('\n'))
await page.screenshot({ path: OUT + '/dev-stats.png' })

await browser.close()
