/** 统一的网络层：超时、429 退避、JSON 解析都收在这里 */

const TIMEOUT = 15000

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function once(url: string, headers?: Record<string, string>, timeout = TIMEOUT): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal })
    if (!res.ok) throw new HttpError('HTTP ' + res.status, res.status)
    return await res.json()
  } catch (e: any) {
    if (e instanceof HttpError) throw e
    if (e && e.name === 'AbortError') throw new HttpError('timeout', 0)
    throw new HttpError((e && e.message) || 'network error', 0)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Crossref 偶尔 429，退避两次；其它错误直接抛，别把页面打成空态。
 * retry / timeout 可按调用方收紧：顶上页面的请求宁可快速失败回落到缓存，也别干等半分钟。
 */
export async function getJson(
  url: string,
  headers?: Record<string, string>,
  retry = 3,
  timeout = TIMEOUT,
): Promise<any> {
  let last: any = null
  for (let i = 0; i < retry; i += 1) {
    try {
      return await once(url, headers, timeout)
    } catch (e: any) {
      last = e
      const status = e && e.status
      if (status !== 429 && status !== 0) throw e
      // 超时不再重试：都等到超时了，再等一轮多半还是超，只会让页面多转十几秒
      if (status === 0 && String(e && e.message).includes('timeout')) throw e
      await new Promise((r) => setTimeout(r, 700 * (i + 1)))
    }
  }
  throw last || new HttpError('request failed', 0)
}

/** 并发受限的 map，避免一口气打出几十个请求 */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let cursor = 0
  const workers = new Array(Math.min(limit, items.length || 1)).fill(0).map(async () => {
    for (;;) {
      const idx = cursor
      cursor += 1
      if (idx >= items.length) return
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}
