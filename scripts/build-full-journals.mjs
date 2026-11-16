/**
 * 把 fetch-all-journals.mjs 拉下来的全库期刊，打包成 App 可直接用的紧凑数据文件。
 * 用「ISSN\t刊名\n」逐行拼成一个字符串常量，避免 17 万个 JSON 对象的键名开销。
 *
 * 用法：node scripts/build-full-journals.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const RAW = path.resolve('scripts/out/journals-full.raw.json')
const OUT = path.resolve('src/data/journals-full.ts')

if (!fs.existsSync(RAW)) {
  console.error('缺少', RAW, '请先运行 fetch-all-journals.mjs')
  process.exit(1)
}

const items = JSON.parse(fs.readFileSync(RAW, 'utf8'))
// 用 \t 分隔字段、\n 分隔行；刊名已在拉取时归一过空白，不含 \t \n
const lines = items.map((j) => `${j.i}\t${j.n}`).join('\n')
const literal = JSON.stringify(lines) // 安全转义引号/反斜杠

const body = `/**
 * Crossref 全库期刊（约 ${items.length} 本），由 scripts/build-full-journals.mjs 生成，勿手改。
 * 紧凑格式：每行 "ISSN\\t刊名"，运行时按 \\n / \\t 拆分。
 * 来源：https://api.crossref.org/journals
 */
export const FULL_JOURNALS_RAW: string = ${literal}
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, body, 'utf8')
console.log('期刊数:', items.length)
console.log('写出', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB')
