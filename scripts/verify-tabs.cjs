/** 验收：4 个 tab、星标收藏、收藏页、我的页设置入口 */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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
  page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 200)))

  // 点底部 tab：同名文字在页面里出现多次，取最靠下的那个
  const clickTab = (text) =>
    page.evaluate((t) => {
      const hit = Array.from(document.querySelectorAll('div,span,button,a'))
        .filter((n) => (n.textContent || '').trim() === t && n.children.length === 0)
        .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)
      if (!hit[0]) return false
      hit[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, text)

  const clickStar = (glyph) =>
    page.evaluate((g) => {
      const el = Array.from(document.querySelectorAll('div')).find(
        (d) => d.children.length === 0 && (d.textContent || '').trim() === g,
      )
      if (!el) return false
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, glyph)

  const text = () => page.evaluate(() => document.body.innerText)

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 })
  await sleep(10000)

  console.log('tab 栏:', (await text()).split('\n').slice(-6).join(' | '))
  await page.screenshot({ path: 'C:/tmp/tab-papers.png' })

  // 收藏第一篇
  console.log('点星标:', await clickStar('☆'))
  await sleep(1200)
  console.log('星标已变实心:', (await text()).includes('★'))

  await clickTab('收藏')
  await sleep(2500)
  const favText = await text()
  console.log('收藏页标题:', favText.split('\n').slice(0, 3).join(' | '))
  console.log('收藏页有卡片:', !favText.includes('还没有收藏的论文'))
  await page.screenshot({ path: 'C:/tmp/tab-favs.png' })

  // 取消收藏 → 空状态
  await clickStar('★')
  await sleep(1500)
  console.log('取消后空状态:', (await text()).includes('还没有收藏的论文'))

  await clickTab('我的')
  await sleep(2500)
  const meText = await text()
  console.log('我的页含设置项:', ['翻译接口', '清除本地缓存', '收藏'].every((k) => meText.includes(k)))
  await page.screenshot({ path: 'C:/tmp/tab-me.png' })

  await browser.close()
})()
