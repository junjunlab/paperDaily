/** 验证：全库期刊面板输入 gpb / nejm 是否弹出匹配期刊 */
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] || 'http://127.0.0.1:8082'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = process.env.SHOT_OUT || 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 })
await wait(8000)

// 点击「搜索 / 切换」打开期刊面板：用包含关系定位最内层
const tapText = async (text, exact = true) => {
  const pt = await page.evaluate(
    ({ text, exact }) => {
      const nodes = Array.from(document.querySelectorAll('div,span'))
      const hits = nodes.filter((el) => {
        const s = (el.textContent || '').trim()
        const r = el.getBoundingClientRect()
        const match = exact ? s === text : s.includes(text)
        return match && r.width > 2 && r.width < 260 && r.height > 8 && r.height < 60
      })
      hits.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)
      const el = hits[0]
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    },
    { text, exact },
  )
  if (!pt) return false
  await page.mouse.click(pt.x, pt.y)
  await wait(1200)
  return true
}

console.log('点开期刊面板:', await tapText('搜索 / 切换', false) ? '成功' : '失败')
await wait(1500)

// 精确列出所有 input 的 placeholder，便于定位面板搜索框
const inputs = await page.evaluate(() =>
  Array.from(document.querySelectorAll('input')).map((i) => ({
    ph: i.placeholder || '',
    value: i.value || '',
    rect: (({ x, y, width, height }) => ({ x, y, width, height }))(i.getBoundingClientRect()),
  })),
)
console.log('页面 input 列表:', JSON.stringify(inputs))

// 面板搜索框：placeholder 含「NEJM」或「 ISSN」，取最靠下的那个（Modal 在后）
const targetIdx = await page.evaluate(() => {
  const arr = Array.from(document.querySelectorAll('input'))
  let best = -1
  arr.forEach((el, idx) => {
    const ph = el.placeholder || ''
    if (ph.includes('NEJM') || ph.includes('ISSN')) best = idx
  })
  return best
})
console.log('面板搜索框索引:', targetIdx)

const typeInto = async (text) => {
  await page.evaluate((idx) => {
    const el = Array.from(document.querySelectorAll('input'))[idx]
    if (el) el.focus()
  }, targetIdx)
  await page.keyboard.type(text, { delay: 70 })
  await wait(2200)
}

if (targetIdx >= 0) {
  await typeInto('gpb')
  const text = await page.evaluate(() => document.body.innerText || '')
  const hasGpb = text.includes('Genomics Proteomics')
  console.log('gpb 命中 Genomics Proteomics:', hasGpb ? '是' : '否')
  await page.screenshot({ path: OUT + '/journal-full-gpb.png' })
  console.log('截图:', OUT + '/journal-full-gpb.png')

  // 换搜全库冷门刊 ScienceAsia
  await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  await typeInto('ScienceAsia')
  const t2 = await page.evaluate(() => document.body.innerText || '')
  console.log('ScienceAsia（全库冷门刊）命中:', t2.includes('ScienceAsia') ? '是' : '否')
  await page.screenshot({ path: OUT + '/journal-full-cold.png' })
}

await browser.close()
