export type FeedItem = {
  title: string
  slug: string
  excerpt?: string | null
  publishedAt?: Date | string | null
  updatedAt?: Date | string | null
  category?: string | null
  tags?: string[]
}

export type FeedChannel = {
  title: string
  description: string
  siteUrl: string
  feedUrl: string
  language?: string
}

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

export function escapeXml(value: string): string {
  // Drop characters that are invalid in XML 1.0 before escaping.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/[&<>"']/g, (c) => XML_ESCAPES[c])
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildRssXml(channel: FeedChannel, items: FeedItem[]): string {
  const base = channel.siteUrl.replace(/\/+$/, '')
  const latest = items.map((item) => toDate(item.updatedAt) || toDate(item.publishedAt)).find(Boolean)
  const entries = items.map((item) => {
    const link = `${base}/posts/${encodeURIComponent(item.slug)}`
    const pubDate = toDate(item.publishedAt)
    const categories = [item.category, ...(item.tags || [])].filter((value): value is string => Boolean(value))
    return [
      '    <item>',
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      item.excerpt ? `      <description>${escapeXml(item.excerpt)}</description>` : '',
      pubDate ? `      <pubDate>${pubDate.toUTCString()}</pubDate>` : '',
      ...categories.map((name) => `      <category>${escapeXml(name)}</category>`),
      '    </item>',
    ].filter(Boolean).join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(base + '/')}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language || 'zh-CN')}</language>`,
    `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />`,
    latest ? `    <lastBuildDate>${latest.toUTCString()}</lastBuildDate>` : '',
    ...entries,
    '  </channel>',
    '</rss>',
    '',
  ].filter((line) => line !== '').join('\n') + '\n'
}

/** Serialise JSON-LD for a <script type="application/ld+json"> block without allowing tag breakout. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
