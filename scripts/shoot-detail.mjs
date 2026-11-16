/** 点开第一篇论文，验证详情弹层（含底部 AI 声明） */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8793/index.html'
const NEEDLE = process.argv[3] || 'Orbital'
const OUT = 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(4500)

const pos = await page.evaluate((needle) => {
  const all = Array.from(document.querySelectorAll('div'))
  const hit = all.find((el) => (el.textContent || '').includes(needle))
  if (!hit) return null
  // 往上找一个有圆角的卡片容器
  let node = hit
  for (let i = 0; i < 6 && node; i += 1) {
    const r = node.getBoundingClientRect()
    if (r.width > 200 && r.height > 60) {
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }
    node = node.parentElement
  }
  const r = hit.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}, NEEDLE)

if (!pos) {
  console.log('没找到卡片')
} else {
  await page.mouse.click(pos.x, pos.y)
  await wait(4000)
  await page.screenshot({ path: OUT + '/v3-detail.png' })
  console.log('截图 detail')
  // 滚到底看声明
  await page.evaluate(() => {
    const scrollers = Array.from(document.querySelectorAll('div')).filter((el) => el.scrollHeight > el.clientHeight + 40)
    if (scrollers.length) scrollers[scrollers.length - 1].scrollTop = 99999
  })
  await wait(1200)
  await page.screenshot({ path: OUT + '/v3-detail-bottom.png' })
  console.log('截图 detail-bottom')
}

await browser.close()
