/** 验收 3：全部 + 3 天，滚动收集所有卡片日期，检查是否有时间窗外的日期 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:8082'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: { width: 430, height: 932 },
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  const clickText = (text, exact = true) =>
    page.evaluate(
      (t, ex) => {
        const nodes = Array.from(document.querySelectorAll('div,span,button,a'))
        const hit = nodes.filter((n) => {
          const s = (n.textContent || '').trim()
          return ex ? s === t : s.includes(t)
        })
        const el = hit[hit.length - 1]
        if (!el) return false
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        return true
      },
      text,
      exact,
    )

  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(6000)
  // 首页筛选默认折叠，先展开再点时间/期刊 chip
  await clickText('筛选', true)
  await sleep(300)
  await clickText('3天', true)
  await sleep(25000)

  const seen = new Set()
  for (let i = 0; i < 12; i += 1) {
    const list = await page.evaluate(() => {
      const texts = Array.from(document.body.innerText.matchAll(/20\d{2}-\d{2}-\d{2}/g)).map((m) => m[0])
      return texts
    })
    list.forEach((d) => seen.add(d))
    await page.evaluate(() => {
      // RN Web 的 FlatList 是滚动容器，找可滚动的那个
      const all = Array.from(document.querySelectorAll('div'))
      const sc = all.filter((d) => d.scrollHeight > d.clientHeight + 40)
      const target = sc[sc.length - 1]
      if (target) target.scrollTop += 2000
      window.scrollBy(0, 2000)
    })
    await sleep(1200)
  }
  console.log('收集到的日期：', [...seen].sort().join(', '))
  const win = ['2026-11-14', '2026-11-15', '2026-11-16']
  const bad = [...seen].filter((d) => !win.includes(d))
  console.log('窗口外日期：', bad.join(', ') || '(none)')
  await browser.close()
})()
