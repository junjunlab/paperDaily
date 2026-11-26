const puppeteer = require('puppeteer-core')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    defaultViewport: { width: 430, height: 932 },
    args: ['--no-sandbox'],
  })
  const p = await b.newPage()
  await p.setCacheEnabled(false)
  await p.goto('http://127.0.0.1:8082?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 })
  await sleep(9500)
  const read = () => p.evaluate(() => {
    const txt = document.body.innerText
    const nodes = Array.from(document.querySelectorAll('div,span,p'))
    const find = (label) => nodes.filter((n) => (n.textContent || '').trim() === label && !n.children.length).sort((a, c) => c.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]
    return {
      filter: !!find('筛选'),
      hide: !!find('收起筛选'),
      peek: !!find('3篇 · 展开 ›') || txt.includes('篇 · 展开'),
      expandedDomains: !!find('生命科学'),
      firstPaperY: (() => {
        const n = nodes.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test((x.textContent || '').trim())).sort((a, c) => a.getBoundingClientRect().top - c.getBoundingClientRect().top)[0]
        return n ? Math.round(n.getBoundingClientRect().top) : -1
      })(),
      lines: txt.replace(/\n+/g, ' | ').slice(0, 420),
    }
  })
  const before = await read()
  console.log('初始:', JSON.stringify(before))
  await p.screenshot({ path: 'C:/tmp/compact-before.png' })
  // 点筛选条
  const clickText = (label) => p.evaluate((x) => {
    const hit = Array.from(document.querySelectorAll('div,span,p')).filter((n) => (n.textContent || '').trim() === x && !n.children.length).sort((a, c) => c.getBoundingClientRect().top - a.getBoundingClientRect().top)
    if (!hit[0]) return false
    const r = hit[0].getBoundingClientRect()
    hit[0].dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }))
    return true
  }, label)
  console.log('点筛选:', await clickText('筛选'))
  await sleep(600)
  const opened = await read()
  console.log('展开后:', JSON.stringify(opened))
  await p.screenshot({ path: 'C:/tmp/compact-open.png' })
  // 点精选展开
  console.log('点精选:', await clickText('3篇 · 展开 ›'))
  await sleep(400)
  const picks = await p.evaluate(() => document.body.innerText.includes('按影响因子和你常看的领域自动挑'))
  console.log('精选已展开:', picks)
  await p.screenshot({ path: 'C:/tmp/compact-picks.png' })
  await b.close()
})()
