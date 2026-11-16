/** 测试能否从 Nature 系页面直接取摘要（给未入库的新论文兜底） */
const DOI = process.argv[2] || '10.1038/s41531-026-01612-4'
const suffix = DOI.replace(/^10\.1038\//, '')
const url = 'https://www.nature.com/articles/' + suffix

const main = async () => {
  const t0 = Date.now()
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; paperdaily/1.0)' } })
  const html = await res.text()
  console.log('status', res.status, '| ms', Date.now() - t0, '| bytes', html.length)

  const meta =
    html.match(/<meta[^>]+name="dc\.description"[^>]+content="([^"]{60,})"/i) ||
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]{60,})"/i)
  const absDiv = html.match(/<div[^>]+id="Abs1-content"[^>]*>([\s\S]{80,4000}?)<\/div>/i)
  const secAbs = html.match(/<section[^>]+data-title="Abstract"[\s\S]{0,3000}?<p[^>]*>([\s\S]{80,3000}?)<\/p>/i)

  const decode = (s) =>
    String(s || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/\s+/g, ' ')
      .trim()

  console.log('meta dc.description:', meta ? decode(meta[1]).slice(0, 160) + '…' : '无')
  console.log('div#Abs1-content  :', absDiv ? decode(absDiv[1]).slice(0, 160) + '…' : '无')
  console.log('section Abstract  :', secAbs ? decode(secAbs[1]).slice(0, 160) + '…' : '无')
}

main().catch((e) => console.error('FAIL', e.message))
