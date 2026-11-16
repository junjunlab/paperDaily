/** 重新抓 README 用的四张界面图（390×844，中文界面） */
const puppeteer = require('puppeteer-core')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'docs/screenshots/'

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 160)))

  const clickTab = (t) =>
    page.evaluate((x) => {
      const hit = Array.from(document.querySelectorAll('div,span,button,a'))
        .filter((n) => (n.textContent || '').trim() === x && !n.children.length)
        .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)
      if (!hit[0]) return false
      hit[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, t)

  await page.goto('http://localhost:8082?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(4000)
  // 留一点偏好（领域=生命科学）让列表有货，但清掉收藏以外的东西
  await page.evaluate(() => {
    localStorage.removeItem('pd.favs')
    localStorage.removeItem('pd.picks')
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(14000) // 等列表 + 精选卡 + 译文

  await page.screenshot({ path: OUT + 'home.png' })
  console.log('home ✓')

  // 收藏第一、二篇，收藏页才有内容
  const stars = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('div')).filter(
      (d) => !d.children.length && (d.textContent || '').trim() === '☆',
    )
    list.slice(0, 3).forEach((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    return list.length
  })
  console.log('点到的星标数:', stars)
  await sleep(1500)

  await clickTab('收藏')
  await sleep(1800)
  await page.screenshot({ path: OUT + 'favs.png' })
  console.log('favs ✓')

  await clickTab('我的')
  await sleep(1800)
  await page.screenshot({ path: OUT + 'me.png' })
  console.log('me ✓')

  await clickTab('顶刊')
  await sleep(2600)
  await page.screenshot({ path: OUT + 'issues.png' })
  console.log('issues ✓')

  await clickTab('论文')
  await sleep(1200)
  // 详情：点第一篇标题
  const opened = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div'))
      .filter((d) => !d.children.length && (d.textContent || '').trim().length > 40)
      .find((d) => d.getBoundingClientRect().top > 200)
    if (!el) return false
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  })
  await sleep(3500)
  console.log('打开详情:', opened)
  await page.screenshot({ path: OUT + 'detail.png' })
  console.log('detail ✓')

  await browser.close()
})()
