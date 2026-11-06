import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { sortSeriesPosts } from '@/lib/post-series'

export interface SeriesSummary {
  name: string
  count: number
  latestAt: Date | null
  first: {
    slug: string
    title: string
    excerpt: string | null
    coverImage: string | null
    isProtected: boolean
  }
  category: { name: string; slug: string } | null
  /** The opening parts, in reading order, for a short table of contents. */
  parts: { slug: string; title: string; order: number | null }[]
}

const PREVIEW_PARTS = 4

/**
 * One summary per published series, newest-updated first.
 * `where` narrows which posts count (e.g. a category filter).
 */
export async function getSeriesSummaries(where: Prisma.PostWhereInput = {}): Promise<SeriesSummary[]> {
  const posts = await prisma.post.findMany({
    where: { ...where, status: 'PUBLISHED', series: { not: null } },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      isProtected: true,
      publishedAt: true,
      series: true,
      seriesOrder: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'asc' }, { id: 'asc' }],
  })
  return summarizeSeries(posts)
}

type SeriesPost = SeriesSummary['first'] & {
  publishedAt: Date | null
  series: string | null
  seriesOrder: number | null
  category: SeriesSummary['category']
}

export function summarizeSeries(posts: SeriesPost[]): SeriesSummary[] {
  const groups = new Map<string, SeriesPost[]>()
  for (const post of posts) {
    if (!post.series) continue
    const list = groups.get(post.series) ?? []
    list.push(post)
    groups.set(post.series, list)
  }
  const out: SeriesSummary[] = []
  for (const [name, list] of groups) {
    const ordered = sortSeriesPosts(list)
    const first = ordered[0]
    const latestAt = list.reduce<Date | null>(
      (max, p) => (p.publishedAt && (!max || p.publishedAt > max) ? p.publishedAt : max),
      null,
    )
    out.push({
      name,
      count: list.length,
      latestAt,
      first: {
        slug: first.slug,
        title: first.title,
        excerpt: first.excerpt,
        coverImage: first.coverImage,
        isProtected: first.isProtected,
      },
      category: first.category,
      parts: ordered.slice(0, PREVIEW_PARTS).map((p) => ({ slug: p.slug, title: p.title, order: p.seriesOrder })),
    })
  }
  return out.sort((a, b) => (b.latestAt?.getTime() ?? 0) - (a.latestAt?.getTime() ?? 0))
}

/**
 * Keeps a date-ordered feed readable: the first (newest) post of each series stands in
 * for the whole series, and the series' other posts are dropped.
 */
export function collapseSeriesPosts<T extends { series?: string | null }>(posts: T[]): T[] {
  const seen = new Set<string>()
  return posts.filter((post) => {
    if (!post.series) return true
    if (seen.has(post.series)) return false
    seen.add(post.series)
    return true
  })
}
