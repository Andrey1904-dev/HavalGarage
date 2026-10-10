/**
 * Загрузка официальных документов.
 *
 * Принципы:
 *  — только обычные GET-запросы с честным User-Agent;
 *  — никакого обхода CAPTCHA, авторизации, блокировок и технических ограничений;
 *  — таймауты и пауза между запросами, чтобы не создавать нагрузку на источник;
 *  — контрольная сумма содержимого нужна, чтобы заметить новую версию документа.
 */
import { createHash } from 'node:crypto'

export const USER_AGENT = 'HavalGarage-catalog-importer/1.0 (+independent open-source catalog)'
const DEFAULT_TIMEOUT_MS = 30_000

/** Пауза между запросами к одному источнику, мс */
export const REQUEST_DELAY_MS = 700

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Загрузить документ.
 *
 * @returns {Promise<{url: string, ok: boolean, status: number|null, bytes: number,
 *                    checksum: string|null, contentType: string|null,
 *                    body: Buffer|null, error: string|null, ms: number}>}
 */
export async function fetchDocument(url, { timeoutMs = DEFAULT_TIMEOUT_MS, accept = '*/*' } = {}) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    const buffer = Buffer.from(await res.arrayBuffer())
    return {
      url,
      ok: res.ok,
      status: res.status,
      bytes: buffer.byteLength,
      checksum: buffer.byteLength > 0 ? sha256(buffer) : null,
      contentType: res.headers.get('content-type'),
      body: res.ok ? buffer : null,
      error: res.ok ? null : `HTTP ${res.status}`,
      ms: Date.now() - started,
    }
  } catch (e) {
    return {
      url,
      ok: false,
      status: null,
      bytes: 0,
      checksum: null,
      contentType: null,
      body: null,
      error: e?.message ?? String(e),
      ms: Date.now() - started,
    }
  }
}

/** Загрузить документ с паузой перед запросом (щадящий режим для источника) */
export async function fetchDocumentThrottled(url, options = {}) {
  await sleep(options.delayMs ?? REQUEST_DELAY_MS)
  return fetchDocument(url, options)
}

export { sleep }
