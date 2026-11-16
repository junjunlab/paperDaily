/**
 * 验收联想面板：输入 ribo → 面板出现 → 回车 → 面板消失且搜索结果出来；
 * 再输入 → 面板出现 → 点页面空白处 → 面板消失。
 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 430, height: 932 }, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)

  const hasPanel = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('div')).some((d) => (d.textContent || '').trim().startsWith('搜索「') && d.children.length === 0),
    )
  const bodyText = () => page.evaluate(() => document.body.innerText)

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(6000)

  // 输入 ribo
  await page.evaluate(() => {
    const el = document.querySelector('input')
    el.focus()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'ribo')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await sleep(4000)
  console.log('输入后是否出现联想面板：', await hasPanel())

  // 回车
  await page.evaluate(() => {
    const el = document.querySelector('input')
    el.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }))
  })
  await sleep(6000)
  console.log('回车后是否还有联想面板：', await hasPanel())
  const afterEnter = await bodyText()
  console.log('回车后前几行：', afterEnter.split('\n').slice(0, 12).join(' | '))
  await page.screenshot({ path: 'C:/tmp/sug-enter.png' })

  // 再输入 → 面板应重现
  await page.evaluate(() => {
    const el = document.querySelector('input')
    el.focus()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'ribo')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await sleep(3000)
  console.log('再次输入后是否出现联想面板：', await hasPanel())

  // 点空白处（输入框以外）
  await page.mouse.click(200, 600)
  await sleep(1500)
  console.log('点空白后是否还有联想面板：', await hasPanel())

  await browser.close()
})()
