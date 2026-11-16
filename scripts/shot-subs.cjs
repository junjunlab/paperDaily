/** 二级方向面板截图：选中某领域后截顶部筛选区 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const DOMAIN = process.argv[2] || '生命科学'
const OUT = process.argv[3] || 'C:/tmp/subs.png'

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
        // 只取页面最上方（筛选区）的那个同名节点：论文卡片里也会出现领域名
        const hit = Array.from(document.querySelectorAll('div,span,button,a'))
          .filter((n) => (ex ? (n.textContent || '').trim() === t : (n.textContent || '').includes(t)))
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        const el = hit[0]
        if (!el) return false
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        return true
      },
      text,
      exact,
    )

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(9000)
  const ok = await clickText(DOMAIN, true)
  await sleep(20000)
  // 展开「更多方向」
  const more = await page.evaluate(() =>
    Array.from(document.querySelectorAll('div'))
      .filter((d) => (d.textContent || '').includes('更多方向') && d.children.length === 0)
      .map((d) => d.textContent)[0] || '',
  )
  if (more) {
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).filter(
        (d) => (d.textContent || '').includes('更多方向') && d.children.length === 0,
      )[0]
      el && el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await sleep(2500)
  }
  await page.screenshot({ path: OUT })
  const body = await page.evaluate(() => document.body.innerText)
  console.log('点击领域成功:', ok)
  console.log('更多方向按钮:', more || '(无)')
  console.log(body.split('\n').slice(0, 40).join(' | '))
  await browser.close()
})()
