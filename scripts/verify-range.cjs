/**
 * 一次性验收脚本：打开 Web 版，选 Cell + 3 天，确认列表里不再出现时间窗外的文章。
 * 用法：node scripts/verify-range.cjs
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
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200))
  })

  await page.setCacheEnabled(false)
  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(6000)
  const clickText = async (text, exact = true) => {
    const ok = await page.evaluate(
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
    return ok
  }

  // 首页筛选默认折叠，先展开再点时间/期刊 chip
  await clickText('筛选', true)
  await sleep(300)

  // 选 3 天
  await clickText('3天')
  await sleep(1500)

  // 打开期刊面板 → 输入 Cell
  const opened = await clickText('搜索 / 切换', false)
  await sleep(1200)
  const typed = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'))
    const el = inputs[inputs.length - 1]
    if (!el) return false
    el.focus()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'Cell')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })
  await sleep(1500)
  const picked = await clickText('Cell', true)
  await sleep(25000)

  await page.screenshot({ path: '/tmp/cell-3d.png' })

  const text = await page.evaluate(() => document.body.innerText)
  console.log('--- opened panel:', opened, 'typed:', typed, 'picked:', picked)
  console.log('--- body ---')
  console.log(text.slice(0, 700))
  console.log('--- errors ---')
  console.log(errors.slice(0, 8).join('\n') || '(none)')

  await browser.close()
})()
