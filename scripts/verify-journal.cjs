/** 用法：node scripts/verify-journal.cjs "Nature Medicine" 7 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const NAME = process.argv[2] || 'Cell'
const RANGE = process.argv[3] || '7天'

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 430, height: 932 }, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  const clickText = (text, exact = true) =>
    page.evaluate((t, ex) => {
      const hit = Array.from(document.querySelectorAll('div,span,button,a')).filter((n) => (ex ? (n.textContent || '').trim() === t : (n.textContent || '').includes(t)))
      const el = hit[hit.length - 1]
      if (!el) return false
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, text, exact)
  const dates = () => page.evaluate(() => [...new Set(Array.from(document.body.innerText.matchAll(/20\d{2}-\d{2}-\d{2}/g)).map((m) => m[0]))].sort())

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(6000)
  // 首页筛选默认折叠，先展开再点时间/期刊 chip
  await clickText('筛选', true)
  await sleep(300)
  await clickText('搜索 / 切换', false)
  await sleep(1200)
  await page.evaluate((n) => {
    const inputs = Array.from(document.querySelectorAll('input'))
    const el = inputs[inputs.length - 1]
    el.focus()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, n)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, NAME)
  await sleep(1800)
  await clickText(NAME, true)
  await sleep(22000)
  await clickText(RANGE, true)
  await sleep(15000)
  await page.screenshot({ path: 'C:/tmp/j-' + NAME.replace(/\W+/g, '_') + '.png' })
  const body = await page.evaluate(() => document.body.innerText)
  console.log('[' + NAME + ' + ' + RANGE + '] 日期：', (await dates()).join(', '))
  console.log('[空状态]', body.includes('这个时间段还没有新论文'))
  await browser.close()
})()
