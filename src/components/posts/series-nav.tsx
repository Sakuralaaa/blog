import Link from 'next/link'
import { Layers } from 'lucide-react'
import { seriesHref } from '@/lib/post-series'

export type SeriesNavData = {
  name: string
  currentSlug: string
  posts: { id: string; title: string; slug: string }[]
}

/** Series table of contents shown above an article that belongs to a series. */
export function SeriesNav({ series }: { series: SeriesNavData }) {
  const total = series.posts.length
  const index = series.posts.findIndex((post) => post.slug === series.currentSlug)
  if (total === 0 || index < 0) return null

  return (
    <details className="card series-nav" open={total <= 8 || undefined}>
      <summary className="series-nav__head">
        <span className="series-nav__label">
          <Layers size={14} aria-hidden="true" />
          系列
        </span>
        <strong className="series-nav__name">{series.name}</strong>
        <span className="series-nav__count">
          第 {index + 1} / {total} 篇
        </span>
      </summary>
      <ol className="series-nav__list">
        {series.posts.map((post, i) => (
          <li key={post.id} data-current={i === index || undefined}>
            <span className="series-nav__num">{String(i + 1).padStart(2, '0')}</span>
            {i === index ? (
              <span aria-current="page">{post.title}</span>
            ) : (
              <Link href={`/posts/${post.slug}`}>{post.title}</Link>
            )}
          </li>
        ))}
      </ol>
      <Link href={seriesHref(series.name)} className="text-link series-nav__all">
        查看整个系列
      </Link>
    </details>
  )
}

/** Previous/next inside the series; null when the post is not in one. */
export function seriesNeighbours(series: SeriesNavData | null) {
  if (!series) return null
  const index = series.posts.findIndex((post) => post.slug === series.currentSlug)
  if (index < 0) return null
  return {
    prevPost: series.posts[index - 1] ?? null,
    nextPost: series.posts[index + 1] ?? null,
  }
}
