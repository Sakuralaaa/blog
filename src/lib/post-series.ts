import { RequestBodyError } from './request-body'

export const SERIES_NAME_MAX = 80
export const SERIES_ORDER_MAX = 9999

export type SeriesUpdate = { series?: string | null; seriesOrder?: number | null }

export function normalizeSeriesName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Reads `series` / `seriesOrder` from a post write body.
 * Missing keys stay undefined (no change); null or '' clears them.
 * Clearing the series also clears the order unless an order is given.
 */
export function parseSeriesInput(body: Record<string, unknown>): SeriesUpdate {
  const out: SeriesUpdate = {}

  if (body.series !== undefined) {
    if (body.series === null) {
      out.series = null
    } else if (typeof body.series !== 'string') {
      throw new RequestBodyError('series 格式错误', 400)
    } else {
      const name = normalizeSeriesName(body.series)
      if (name.length > SERIES_NAME_MAX) throw new RequestBodyError(`系列名最多 ${SERIES_NAME_MAX} 个字符`, 400)
      out.series = name || null
    }
  }

  if (body.seriesOrder !== undefined) {
    const raw = body.seriesOrder
    if (raw === null || raw === '') {
      out.seriesOrder = null
    } else {
      const n = typeof raw === 'string' ? Number(raw.trim()) : raw
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > SERIES_ORDER_MAX) {
        throw new RequestBodyError(`seriesOrder 须为 1 到 ${SERIES_ORDER_MAX} 的整数`, 400)
      }
      out.seriesOrder = n
    }
  }

  if (out.series === null && out.seriesOrder === undefined) out.seriesOrder = null
  return out
}

export function seriesHref(name: string) {
  return `/posts?series=${encodeURIComponent(name)}`
}

/** Numbered parts first by number; unnumbered parts keep their given order after them. */
export function sortSeriesPosts<T extends { seriesOrder: number | null }>(posts: T[]): T[] {
  return posts
    .map((post, index) => ({ post, index }))
    .sort((a, b) => {
      const ao = a.post.seriesOrder ?? Number.MAX_SAFE_INTEGER
      const bo = b.post.seriesOrder ?? Number.MAX_SAFE_INTEGER
      return ao - bo || a.index - b.index
    })
    .map(({ post }) => post)
}
