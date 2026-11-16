/** 验证：选「生命科学 + 3天」是否覆盖多天；搜 gpb 是否命中期刊 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
await wait(7000)

const tap = async (text) => {
  const pt = await page.evaluate((t) => {
    const nodes = Array.from(document.querySelectorAll('div,span'))
    const hits = nodes.filter((el) => {
      const s = (el.textContent || '').trim()
      const r = el.getBoundingClientRect()
      return s === t && r.width > 10 && r.width < 220 && r.height > 10
    })
    // 取最内层（文字节点最小）
    hits.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)
    const el = hits[0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, text)
  if (!pt) {
    console.log('✗ 找不到', text)
    return false
  }
  await page.mouse.click(pt.x, pt.y)
  await wait(1500)
  console.log('✓ 点击', text)
  return true
}

await tap('生命科学')
await tap('3天')
await wait(12000)

const stat = await page.evaluate(() => {
  const dates = {}
  document.querySelectorAll('div').forEach((el) => {
    const t = (el.textContent || '').trim()
    if (/^20\d{2}-\d{2}(-\d{2})?$/.test(t)) dates[t] = (dates[t] || 0) + 1
  })
  const cards = document.querySelectorAll('div').length
  return { dates }
})
console.log('列表里出现的日期分布:', JSON.stringify(stat.dates))
await page.screenshot({ path: OUT + '/fix-3days.png' })

// 搜 gpb
const hasInput = await page.evaluate(() => {
  const i = document.querySelector('input')
  if (i) {
    i.focus()
    return true
  }
  return false
})
if (hasInput) {
  await page.keyboard.type('gpb', { delay: 60 })
  await page.keyboard.press('Enter')
  await wait(4000)
  const hit = await page.evaluate(() => (document.body.innerText || '').includes('找到期刊'))
  console.log('gpb 命中期刊横幅:', hit ? '有' : '无')
  await page.screenshot({ path: OUT + '/fix-gpb.png' })
}


// 切英文，确认卡片不再出现中文标题
if (await tap('EN')) {
  await wait(3000)
  const zhLeft = await page.evaluate(() => {
    // 卡片标题区域的文本：取所有较长文本块里含中文且不含英文单词的
    const bad = []
    document.querySelectorAll('div').forEach((el) => {
      const t = (el.textContent || '').trim()
      if (t.length >= 10 && t.length <= 200 && /[\u4e00-\u9fa5]{4,}/.test(t) && !/[a-zA-Z]{3,}/.test(t)) bad.push(t.slice(0, 24))
    })
    return bad.slice(0, 5)
  })
  console.log('英文模式下残留的中文文本:', zhLeft.length ? zhLeft : '无')
  await page.screenshot({ path: OUT + '/fix-en.png' })
}


// 打开自定义日期滚轮
if (await tap('中文')) {
  await wait(1500)
  if (await tap('自定义')) {
    await wait(1800)
    await page.screenshot({ path: OUT + '/fix-wheel.png' })
    console.log('截图 滚轮日期')
  }
}

await browser.close()
