/** 验收：选领域 → 点二级方向 → 列表收窄且不报错 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 430, height: 932 }, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 160)))
  const clickTop = (text) =>
    page.evaluate((t) => {
      const hit = Array.from(document.querySelectorAll('div,span,button,a'))
        .filter((n) => (n.textContent || '').trim() === t)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      if (!hit[0]) return false
      hit[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, text)
  const cardCount = () =>
    page.evaluate(() => document.body.innerText.split('\n').filter((l) => /^\d{4}-\d{2}-\d{2}$/.test(l.trim())).length)
  const dates = () =>
    page.evaluate(() => [...new Set((document.body.innerText.match(/20\d{2}-\d{2}-\d{2}/g) || []))].sort())

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(9000)
  await clickTop('生命科学')
  await sleep(18000)
  console.log('领域全部方向 卡片数:', await cardCount())
  await clickTop('免疫学')
  await sleep(6000)
  console.log('免疫学 卡片数:', await cardCount(), '日期:', (await dates()).join(','))
  await page.screenshot({ path: 'C:/tmp/subs-immuno.png' })
  await clickTop('更多方向 +7')
  await sleep(1500)
  console.log('展开后仍有卡片:', await cardCount())
  await browser.close()
})()
