/**
 * Модульные тесты бизнес-логики (node:test).
 *
 * Логика написана на TypeScript, поэтому каждый набор собирается esbuild
 * в CJS-бандл и запускается встроенным тест-раннером Node. Проверяются:
 *  — кредитная математика (аннуитет, обратные задачи, досрочное погашение, ПДН);
 *  — расчёт сценария покупки и график платежей;
 *  — подбор по бюджету, обратный расчёт взноса, стоимость владения,
 *    план накопления, трейд-ин, округление денег;
 *  — целостность каталога: модели, комплектации, официальные характеристики,
 *    оснащение, нормализованные цены, предложения, наличие, история;
 *  — импорт данных (валидация, дубликаты, отказ не затирает цены);
 *  — интеграция с БД (поведение при отсутствии ключей).
 *
 * Запуск: npm test
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
// каталог вне node_modules: тест-раннер Node игнорирует node_modules при поиске файлов
const outdir = path.join(root, '.tmp', 'tests')

const SUITES = [
  'unit.test.ts',
  'catalog.test.ts',
  'calculators.test.ts',
  'imports.test.ts',
  'import-pipeline.test.ts',
  'advisor.test.ts',
  'ui.test.tsx',
]

await build({
  entryPoints: SUITES.map((f) => path.join(root, 'tests', f)),
  bundle: true,
  platform: 'node',
  // ESM: набор интерфейса поднимает jsdom до импорта React и использует
  // динамический импорт, который в CJS-выводе недопустим
  format: 'esm',
  target: 'node20',
  outdir,
  outExtension: { '.js': '.mjs' },
  jsx: 'automatic',
  logLevel: 'error',
  define: {
    'process.env.NODE_ENV': '"test"',
    'import.meta.env': '{}',
  },
  external: [
    'node:test',
    'node:assert/strict',
    'node:fs',
    'node:path',
    'node:os',
    'node:child_process',
    'node:url',
    // jsdom поднимает реальное DOM-окружение и не переносит сборку в бандл
    'jsdom',
  ],
})

// передаём явный список бандлов: в части сборок Node каталог как аргумент
// --test обрабатывается как модуль, а не как набор тестов
const bundles = SUITES.map((f) => path.join(outdir, f.replace(/\.tsx?$/, '.mjs')))

try {
  execFileSync(process.execPath, ['--test', ...bundles], { stdio: 'inherit', cwd: root })
} catch (e) {
  process.exit(e.status ?? 1)
}
