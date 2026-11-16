/** 截图统计页首行，检查氨基酸图谱背景效果 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 430, height: 932 }, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(7000)
  const ok = await page.evaluate(() => {
    const hit = Array.from(document.querySelectorAll('div')).filter((d) => (d.textContent || '').trim() === '统计')
    const el = hit[hit.length - 1]
    if (!el) return false
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  })
  await sleep(3500)
  await page.screenshot({ path: 'C:/tmp/stats-hero.png' })
  console.log('点统计:', ok)
  await browser.close()
})()
