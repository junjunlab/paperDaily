/**
 * 验收：单刊在所选时间窗内没有文章时不显示任何文章（也不再有兜底入口）。
 * 步骤：Cell + 3 天 → 应空；再切 7 天 → 应有文章，且日期都 ≥ 11-10。
 */
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
  const dates = () =>
    page.evaluate(() => [...new Set(Array.from(document.body.innerText.matchAll(/20\d{2}-\d{2}-\d{2}/g)).map((m) => m[0]))].sort())

  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(6000)

  // 选 Cell
  await clickText('搜索 / 切换', false)
  await sleep(1200)
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'))
    const el = inputs[inputs.length - 1]
    el.focus()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'Cell')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await sleep(1500)
  await clickText('Cell', true)
  await sleep(18000)

  // 3 天
  await clickText('3天', true)
  await sleep(10000)
  const body3 = await page.evaluate(() => document.body.innerText)
  await page.screenshot({ path: 'C:/tmp/cell-strict-3d.png' })
  console.log('[Cell+3天] 日期：', (await dates()).join(', '))
  console.log('[Cell+3天] 是否还有兜底按钮「查看最新文章」：', body3.includes('查看最新文章'))
  console.log('[Cell+3天] 空状态文案：', body3.split('\n').filter((l) => l.includes('时间段') || l.includes('7 天')).join(' | '))

  // 7 天
  await clickText('7天', true)
  await sleep(20000)
  const d7 = await dates()
  console.log('[Cell+7天] 日期：', d7.join(', '))
  console.log('[Cell+7天] 是否有 11-10 之前的：', d7.filter((d) => d < '2026-11-10').join(', ') || '(none)')
  await page.screenshot({ path: 'C:/tmp/cell-strict-7d.png' })

  await browser.close()
})()
