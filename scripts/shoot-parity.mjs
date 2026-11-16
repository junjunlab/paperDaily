/** 验证「子领域 / 期刊搜索 / 期刊面板 / 排序」四项补回的功能 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
await wait(7000)

const tapText = async (text) => {
  const pt = await page.evaluate((t) => {
    const nodes = Array.from(document.querySelectorAll('div,span,button'))
    const hit = nodes.reverse().find((el) => {
      const s = (el.textContent || '').trim()
      const r = el.getBoundingClientRect()
      return s === t && r.width > 0 && r.height > 0 && r.width < 400
    })
    if (!hit) return null
    const r = hit.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, text)
  if (!pt) return false
  await page.mouse.click(pt.x, pt.y)
  await wait(1200)
  return true
}

// 1) 切到「生命科学」看子领域行
if (await tapText('生命科学')) {
  await wait(6000)
  await page.screenshot({ path: OUT + '/parity-1-sub.png' })
  console.log('截图 1：子领域')
}

// 2) 搜索 gpb，看期刊命中条
const typed = await page.evaluate(() => {
  const input = document.querySelector('input')
  if (!input) return false
  input.focus()
  return true
})
if (typed) {
  await page.keyboard.type('gpb', { delay: 80 })
  await page.keyboard.press('Enter')
  await wait(3500)
  await page.screenshot({ path: OUT + '/parity-2-hit.png' })
  console.log('截图 2：期刊命中')
}

// 3) 打开期刊面板
if (await tapText('期刊')) {
  await wait(1500)
  await page.screenshot({ path: OUT + '/parity-3-panel.png' })
  console.log('截图 3：期刊面板')
}

await browser.close()
