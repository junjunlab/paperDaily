/**
 * 用本机 Chrome 在手机视口下截图，顺便量出到底哪个节点把页面撑宽了。
 * 用法：node scripts/shoot-web.mjs <url> [输出前缀]
 */
import puppeteer from 'puppeteer-core'
import path from 'node:path'
import fs from 'node:fs'

const URL = process.argv[2] || 'http://127.0.0.1:8793/index.html'
const PREFIX = process.argv[3] || 'app'
const OUT = 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(4000)

// 1) 量宽度：谁比视口宽
const diag = await page.evaluate(() => {
  const vw = window.innerWidth
  const wide = []
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width > vw + 1 && r.height > 0) {
      wide.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && String(el.className).slice(0, 40)) || '',
        w: Math.round(r.width),
        text: (el.textContent || '').trim().slice(0, 30),
      })
    }
  })
  return { vw, scrollWidth: document.documentElement.scrollWidth, count: wide.length, wide: wide.slice(0, 8) }
})
console.log('视口', diag.vw, '| 文档宽度', diag.scrollWidth, '| 超宽节点', diag.count)
diag.wide.forEach((w) => console.log('  ', w.tag, w.w + 'px', w.cls, '|', w.text))

const shoot = async (name) => {
  const file = path.join(OUT, `${PREFIX}-${name}.png`)
  await page.screenshot({ path: file })
  console.log('截图', file)
}

await shoot('home')

// 2) 点底部 tab（按可见文字找，最稳）
const tapText = async (text) => {
  const hit = await page.evaluate((t) => {
    const nodes = Array.from(document.querySelectorAll('div,span'))
    const target = nodes.reverse().find((el) => (el.textContent || '').trim() === t)
    if (!target) return false
    const r = target.getBoundingClientRect()
    if (r.width === 0) return false
    window.__tap = { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    return true
  }, text)
  if (!hit) {
    console.log('找不到可点节点:', text)
    return false
  }
  const pt = await page.evaluate(() => window.__tap)
  await page.mouse.click(pt.x, pt.y)
  await wait(3500)
  return true
}

if (await tapText('顶刊')) await shoot('issues')
if (await tapText('统计')) await shoot('stats')

// 3) 回论文页，打开第一篇详情
if (await tapText('论文')) {
  const opened = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div')).filter((el) => {
      const s = getComputedStyle(el)
      return s.borderRadius.startsWith('20px') && el.getBoundingClientRect().width > 200
    })
    if (!cards.length) return false
    const r = cards[0].getBoundingClientRect()
    window.__tap = { x: r.x + r.width / 2, y: r.y + 40 }
    return true
  })
  if (opened) {
    const pt = await page.evaluate(() => window.__tap)
    await page.mouse.click(pt.x, pt.y)
    await wait(3500)
    await shoot('detail')
  } else {
    console.log('没找到论文卡片')
  }
}

await browser.close()
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
