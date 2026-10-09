/**
 * Собирает smoke-render.mjs (рендер всех маршрутов через react-dom/server)
 * в CJS-бандл esbuild и запускает его в Node.
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outfile = path.join(root, 'node_modules', '.tmp', 'smoke-render.cjs')

await build({
  entryPoints: [path.join(here, 'smoke-render.mjs')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile,
  logLevel: 'error',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: ['node:fs', 'node:path', 'node:url', 'node:child_process'],
})

execFileSync(process.execPath, [outfile], { stdio: 'inherit', cwd: root })
