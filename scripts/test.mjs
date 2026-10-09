/**
 * Модульные тесты бизнес-логики (node:test).
 *
 * Логика написана на TypeScript, поэтому набор собирается esbuild в один
 * CJS-бандл и запускается встроенным тест-раннером Node. Проверяются:
 * аннуитет и досрочное погашение, даты,
 * форматирование, расчёт сценария покупки, целостность каталога HAVAL.
 *
 * Запуск: npm test
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outfile = path.join(root, 'node_modules', '.tmp', 'unit.test.cjs')

await build({
  entryPoints: [path.join(root, 'tests', 'unit.test.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile,
  logLevel: 'error',
  define: {
    'process.env.NODE_ENV': '"test"',
  },
  external: ['node:test', 'node:assert/strict'],
})

try {
  execFileSync(process.execPath, ['--test', outfile], { stdio: 'inherit', cwd: root })
} catch (e) {
  process.exit(e.status ?? 1)
}
