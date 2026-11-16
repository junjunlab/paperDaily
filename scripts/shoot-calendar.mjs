/** 点击「自定义」打开日历并截图 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
await wait(6000)

await page.screenshot({ path: OUT + '/cal-0-home.png' })

const tap = async (text) => {
  const pt = await page.evaluate((t) => {
    const nodes = Array.from(document.querySelectorAll('div,span'))
    const hit = nodes.reverse().find((el) => (el.textContent || '').trim() === t && el.getBoundingClientRect().width > 0)
    if (!hit) return null
    const r = hit.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, text)
  if (!pt) {
    console.log('找不到:', text)
    return false
  }
  await page.mouse.click(pt.x, pt.y)
  await wait(1200)
  return true
}

if (await tap('自定义')) {
  await wait(1200)
  await page.screenshot({ path: OUT + '/cal-1-picker.png' })
  console.log('截图 picker')

  // 选两天：本月 3 号和 12 号（若已过今天则改选月初两天）
  const picked = await page.evaluate(() => {
    const days = Array.from(document.querySelectorAll('div'))
      .filter((el) => /^\d{1,2}$/.test((el.textContent || '').trim()))
      .filter((el) => el.getBoundingClientRect().width > 20 && el.getBoundingClientRect().width < 60)
    const ok = days.filter((el) => !/rgb\(203, 213, 225\)/.test(getComputedStyle(el).color))
    const pick = (n) => {
      const el = ok[n]
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }
    return { a: pick(1), b: pick(6) }
  })
  if (picked.a && picked.b) {
    await page.mouse.click(picked.a.x, picked.a.y)
    await wait(500)
    await page.mouse.click(picked.b.x, picked.b.y)
    await wait(600)
    await page.screenshot({ path: OUT + '/cal-2-selected.png' })
    console.log('截图 selected')
    if (await tap('应用')) {
      await wait(5000)
      await page.screenshot({ path: OUT + '/cal-3-applied.png' })
      console.log('截图 applied')
    }
  } else {
    console.log('没找到可选日期')
  }
}

await browser.close()
