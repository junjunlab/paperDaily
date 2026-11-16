/** 再探两个国内免密钥接口：有道 dict.youdao.com、腾讯 transmart */
const TEXT = 'Single-cell transcriptomics reveals immune reprogramming in human liver fibrosis'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36'

const main = async () => {
  // 1) 有道：老的公开 JSON 接口
  try {
    const u = `https://dict.youdao.com/translate?&doctype=json&type=AUTO&i=${encodeURIComponent(TEXT)}`
    const r = await fetch(u, { headers: { 'User-Agent': UA } })
    const t = await r.text()
    console.log('youdao:', r.status, '| cors=', r.headers.get('access-control-allow-origin') || '-', '|', t.slice(0, 200))
  } catch (e) {
    console.log('youdao ERR', e.message)
  }

  // 2) 腾讯交互翻译
  try {
    const r = await fetch('https://transmart.qq.com/api/imt', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        Referer: 'https://transmart.qq.com/zh-CN/index',
        Origin: 'https://transmart.qq.com',
      },
      body: JSON.stringify({
        header: {
          fn: 'auto_translation',
          client_key: 'browser-chrome-141.0.0-Windows-10-4f3a1c2e-9b7d-4c1e-8f2a-1d3e5b7c9a2f-1700000000000',
        },
        type: 'plain',
        model_category: 'normal',
        source: { lang: 'en', text_list: [TEXT] },
        target: { lang: 'zh' },
      }),
    })
    const t = await r.text()
    console.log('transmart:', r.status, '| cors=', r.headers.get('access-control-allow-origin') || '-', '|', t.slice(0, 240))
  } catch (e) {
    console.log('transmart ERR', e.message)
  }
}

main()
