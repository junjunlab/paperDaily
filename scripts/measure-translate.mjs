/**
 * 测量「切到中文后多久出译文」：清掉本地缓存从零开始，记录第 1 条和第 10 条中文的时间。
 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const ctx = browser.defaultBrowserContext()
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

// 冷启动：先清掉 localStorage 里的译文缓存
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())

const t0 = Date.now()
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })

let first = 0
let tenth = 0
for (let i = 0; i < 60; i += 1) {
  const n = await page.evaluate(() => {
    // 中文标题卡片：一段较长且不含英文句读的中文
    return Array.from(document.querySelectorAll('div')).filter((el) => {
      const t = (el.textContent || '').trim()
      return t.length > 14 && !/[a-zA-Z]{4,}/.test(t) && /[\u4e00-\u9fa5]{8,}/.test(t)
    }).length
  })
  if (!first && n > 0) {
    first = Date.now() - t0
    console.log('第 1 条中文出现在:', (first / 1000).toFixed(1) + 's')
  }
  if (!tenth && n >= 5) {
    tenth = Date.now() - t0
    console.log('第 5 条中文出现在:', (tenth / 1000).toFixed(1) + 's')
    break
  }
  await wait(300)
}

if (!first) console.log('40s 内没出现中文')
await page.screenshot({ path: 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data/speed-zh.png' })
await browser.close()
