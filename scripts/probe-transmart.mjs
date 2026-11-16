/** 验证腾讯交互翻译：批量是否按序返回、长文本是否截断、连续请求是否限流 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36'

const call = async (texts, lang = 'zh') => {
  const body = {
    header: {
      fn: 'auto_translation',
      client_key: 'browser-chrome-141.0.0-Windows-10-4f3a1c2e-9b7d-4c1e-8f2a-1d3e5b7c9a2f-1700000000000',
    },
    type: 'plain',
    model_category: 'normal',
    source: { lang: 'en', text_list: texts },
    target: { lang },
  }
  const t0 = Date.now()
  const r = await fetch('https://transmart.qq.com/api/imt', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Referer: 'https://transmart.qq.com/zh-CN/index',
      Origin: 'https://transmart.qq.com',
    },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => null)
  return { status: r.status, ms: Date.now() - t0, data: j }
}

const main = async () => {
  const titles = [
    'Orbital-Hybridization-Driven Structural and Photocatalytic Properties of Doped Selenospinel',
    'In-Pixel Organic Electrochemical Thermal Receptors for Broadband Thermal Perception',
    'A Study on the Coupling Mechanism between Hospital Culture and Employee Satisfaction',
    'Graphene oxide membranes for ion sieving in aqueous solutions',
    'Quantum spin liquid candidates in a kagome lattice',
    'CRISPR screening identifies host factors required for viral entry',
    'Deep learning accelerates protein structure prediction',
    'Single-cell atlas of the human developing brain',
  ]

  const batch = await call(titles)
  console.log('批量 8 条 | status', batch.status, '| ms', batch.ms)
  const list = (batch.data && batch.data.auto_translation) || []
  console.log('返回条数:', list.length, '| 是否等长:', list.length === titles.length)
  list.slice(0, 3).forEach((t, i) => console.log('  ', i + 1, t))

  // 长摘要
  const abs =
    'Cognitive decline is a major source of disability in Parkinson disease, yet reliable prognostic biomarkers are still lacking. ' +
    'In this observational study, we analyzed longitudinal plasma proteomics from the Parkinson Progression Markers Initiative, ' +
    'including 199 samples from 68 patients and 345 samples from 115 healthy controls. We sought to validate our findings ' +
    'cross-sectionally in an independent cohort. Of the modules with proteins measured on both platforms, the associations for ' +
    'three lysosomal proteins replicated. We identified 284 proteins distinguishing patients from controls.'
  const long = await call([abs])
  const lzh = (long.data && long.data.auto_translation) || []
  console.log('长摘要 | status', long.status, '| 原长', abs.length, '| 译长', (lzh[0] || '').length)
  console.log('  尾部:', (lzh[0] || '').slice(-60))

  // 连续请求 3 次，看是否限流
  for (let i = 0; i < 3; i += 1) {
    const r = await call([`Request number ${i + 1} for rate limit check`])
    console.log(`第 ${i + 1} 次串行 | status`, r.status, '|', ((r.data && r.data.auto_translation) || [''])[0])
  }
}

main().catch((e) => console.error('FAIL', e.message))
