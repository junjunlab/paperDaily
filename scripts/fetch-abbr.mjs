/**
 * 生成「常用期刊简称 → ISSN」映射：简称手写，ISSN 一律去 Crossref 查，
 * 避免凭记忆写错。输出 src/data/abbr.ts
 */
import fs from 'node:fs'

/** [简称, 用于在 Crossref 里检索的全名] */
const WANTED = [
  ['gpb', 'Genomics Proteomics Bioinformatics'],
  ['pnas', 'Proceedings of the National Academy of Sciences'],
  ['nejm', 'New England Journal of Medicine'],
  ['lancet', 'The Lancet'],
  ['jama', 'JAMA'],
  ['bmj', 'BMJ'],
  ['jacs', 'Journal of the American Chemical Society'],
  ['angew', 'Angewandte Chemie'],
  ['prl', 'Physical Review Letters'],
  ['prb', 'Physical Review B'],
  ['prx', 'Physical Review X'],
  ['ncomms', 'Nature Communications'],
  ['natcomm', 'Nature Communications'],
  ['nc', 'Nature Communications'],
  ['nm', 'Nature Medicine'],
  ['nn', 'Nature Nanotechnology'],
  ['nbt', 'Nature Biotechnology'],
  ['ng', 'Nature Genetics'],
  ['ni', 'Nature Immunology'],
  ['nnn', 'Nature Neuroscience'],
  ['ncb', 'Nature Cell Biology'],
  ['nmeth', 'Nature Methods'],
  ['nphys', 'Nature Physics'],
  ['nmat', 'Nature Materials'],
  ['nchem', 'Nature Chemistry'],
  ['cre', 'Cell Reports'],
  ['crm', 'Cell Research'],
  ['cm', 'Cell Metabolism'],
  ['cc', 'Cancer Cell'],
  ['jco', 'Journal of Clinical Oncology'],
  ['cir', 'Circulation'],
  ['ehu', 'European Heart Journal'],
  ['bmc', 'BMC Biology'],
  ['elife', 'eLife'],
  ['sciadv', 'Science Advances'],
  ['sciimmunol', 'Science Immunology'],
  ['scitranslmed', 'Science Translational Medicine'],
  ['scirob', 'Science Robotics'],
  ['jci', 'Journal of Clinical Investigation'],
  ['emboj', 'EMBO Journal'],
  ['nar', 'Nucleic Acids Research'],
  ['gbe', 'Genome Biology and Evolution'],
  ['tib', 'Trends in Biotechnology'],
  ['jmb', 'Journal of Molecular Biology'],
  ['pnasnexus', 'PNAS Nexus'],
  ['mbe', 'Molecular Biology and Evolution'],
  ['acs nano', 'ACS Nano'],
  ['jmedchem', 'Journal of Medicinal Chemistry'],
  ['adma', 'Advanced Materials'],
  ['afm', 'Advanced Functional Materials'],
  ['am', 'Advanced Materials'],
  ['sml', 'Small'],
  ['bst', 'Biosensors and Bioelectronics'],
  ['ehj', 'European Heart Journal'],
  ['diabetes care', 'Diabetes Care'],
  ['jnci', 'Journal of the National Cancer Institute'],
]

const get = async (u) => (await fetch(u, { headers: { 'User-Agent': 'paperdaily/1.0' } })).json()

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const main = async () => {
  const out = {}
  const misses = []

  for (const [abbr, full] of WANTED) {
    try {
      const j = await get(
        'https://api.crossref.org/journals?query=' + encodeURIComponent(full) +
          '&rows=5&mailto=paperdaily@example.com',
      )
      const items = (j && j.message && j.message.items) || []
      const hit =
        items.find((it) => norm(it.title) === norm(full)) ||
        items.find((it) => norm(it.title).startsWith(norm(full).slice(0, 18))) ||
        items[0]
      const issn = hit && (hit.ISSN || [])[0]
      if (issn) {
        out[abbr.toLowerCase()] = { issn: issn.toUpperCase(), name: hit.title }
        console.log('OK  ', abbr, '→', issn, '|', hit.title)
      } else {
        misses.push(abbr)
      }
    } catch (e) {
      misses.push(abbr)
    }
    await new Promise((r) => setTimeout(r, 250))
  }

  const body =
    '/** 由 scripts/fetch-abbr.mjs 生成：常用期刊简称 → ISSN（ISSN 均来自 Crossref 实查） */\n' +
    'export type AbbrEntry = { issn: string; name: string }\n\n' +
    'export const ABBR_ISSN: Record<string, AbbrEntry> = ' +
    JSON.stringify(out, null, 2) +
    '\n'

  fs.writeFileSync('src/data/abbr.ts', body, 'utf8')
  console.log('\n写入 src/data/abbr.ts |', Object.keys(out).length, '条 | 未命中:', misses.join(', ') || '无')
}

main().catch((e) => console.error('FAIL', e.message))
