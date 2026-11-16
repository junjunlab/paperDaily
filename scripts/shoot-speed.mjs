/** 冷启动后 3s / 8s 各截一张，肉眼核对中文出现速度 */
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

const t0 = Date.now()
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
const loaded = Date.now() - t0
console.log('列表加载完成（networkidle）:', (loaded / 1000).toFixed(1) + 's')

await wait(3000 - (Date.now() - t0) > 0 ? 3000 - (Date.now() - t0) : 0)
await page.screenshot({ path: OUT + '/speed-3s.png' })
console.log('3s 截图')

const target = 8000 - (Date.now() - t0)
if (target > 0) await wait(target)
await page.screenshot({ path: OUT + '/speed-8s.png' })
console.log('8s 截图')

await browser.close()
