/**
 * Загрузка снимка каталога (scripts/catalog-data.ts) для служебных скриптов:
 * собирает модуль esbuild и выполняет его в отдельном процессе.
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

export async function loadCatalog() {
  const outfile = path.join(root, '.tmp', 'catalog-data.cjs')
  await build({
    entryPoints: [path.join(here, 'catalog-data.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile,
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  })
  const stdout = execFileSync(process.execPath, [outfile], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  return JSON.parse(stdout)
}
