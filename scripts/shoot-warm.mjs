/** 热启动验证：先跑一次让缓存落地，再刷新，看 1.5s / 3s 的表现 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())

// 第一趟：冷启动，把列表和译文都缓存下来
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
await wait(12000)
console.log('冷启动完成，缓存已落地')

// 第二趟：热启动，只看前 3 秒
const t0 = Date.now()
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await wait(1500)
await page.screenshot({ path: OUT + '/warm-1.5s.png' })
console.log('1.5s 截图')
await wait(Math.max(0, 3000 - (Date.now() - t0)))
await page.screenshot({ path: OUT + '/warm-3s.png' })
console.log('3s 截图')

await browser.close()
