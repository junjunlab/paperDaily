/**
 * 验收 2：① 点「查看最新文章」能展开，并显示「不在所选时间范围内」提示；
 *        ② 「全部 + 3 天」列表里所有卡片日期都落在 11-14~11-16。
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
    page.evaluate(() =>
      Array.from(document.body.innerText.matchAll(/20\d{2}-\d{2}-\d{2}/g)).map((m) => m[0]),
    )

  await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(7000)
  // 首页筛选默认折叠，先展开再点时间/期刊 chip
  await clickText('筛选', true)
  await sleep(300)

  // ---- ① 全部 + 3 天：审计日期
  await clickText('全部', true)
  await clickText('3天', true)
  await sleep(12000)
  const all = await dates()
  const uniq = [...new Set(all)].filter((d) => d !== '2026-11-16')
  console.log('[全部+3天] 出现的日期：', uniq.join(', ') || '(none)')

  // ---- ② Cell + 3 天 → 空状态 → 点按钮
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
  await sleep(20000)
  console.log('--- 空状态 ---')
  console.log((await page.evaluate(() => document.body.innerText)).slice(160, 420).replace(/\n+/g, ' | '))

  const clicked = await clickText('查看最新文章', true)
  await sleep(6000)
  await page.screenshot({ path: '/tmp/cell-latest.png' })
  console.log('点击「查看最新文章」:', clicked)
  console.log('--- 展开后 ---')
  console.log((await page.evaluate(() => document.body.innerText)).slice(150, 460).replace(/\n+/g, ' | '))

  await browser.close()
})()
