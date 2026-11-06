import Link from 'next/link'
import { Layers } from 'lucide-react'
import { isSafeImageSrc } from '@/lib/utils'
import { seriesHref } from '@/lib/post-series'
import { WIDE_CARD_SIZES, mediaSrcSet } from '@/lib/media-srcset'
import type { SeriesSummary } from '@/lib/series-groups'

function formatDate(date: Date | null) {
  if (!date) return null
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' }).format(date)
}

/** "AI 上手全流程（03）：ChatGPT 套餐怎么选" reads as "ChatGPT 套餐怎么选" inside its own series. */
function stripSeriesPrefix(title: string, series: string) {
  if (!title.startsWith(series)) return title
  const rest = title.slice(series.length).replace(/^\s*[（(]\s*\d+\s*[）)]\s*[:：]?\s*/, '').replace(/^\s*[:：·-]\s*/, '')
  return rest || title
}

/** A whole series as one card: links to the series page, with a shortcut to part one. */
export function SeriesCard({ series }: { series: SeriesSummary }) {
  const cover = !series.first.isProtected && isSafeImageSrc(series.first.coverImage) ? series.first.coverImage : null
  const href = seriesHref(series.name)
  const updated = formatDate(series.latestAt)
  return (
    <article className="card card--hover post-card series-card" data-cover={cover ? 'true' : undefined}>
      {cover && (
        <Link href={href} className="post-card__cover" tabIndex={-1} aria-hidden="true">
          <img
            src={cover}
            srcSet={mediaSrcSet(cover)}
            sizes={WIDE_CARD_SIZES}
            alt=""
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
          />
        </Link>
      )}
      <div className="post-card__body">
        <div className="post-card__top">
          <span className="chip chip--hi series-card__badge">
            <Layers size={13} aria-hidden="true" /> 专题
          </span>
          <span className="series-card__meta">
            共 {series.count} 篇{updated ? ` · ${updated}更新` : ''}
          </span>
        </div>
        <h3 className="post-card__title">
          <Link href={href}>{series.name}</Link>
        </h3>
        {!series.first.isProtected && series.first.excerpt && (
          <p className="post-card__excerpt">{series.first.excerpt}</p>
        )}
        {series.parts.length > 1 && (
          <ol className="series-card__parts">
            {series.parts.map((part, index) => (
              <li key={part.slug}>
                <em>{String(part.order ?? index + 1).padStart(2, '0')}</em>
                <Link href={`/posts/${part.slug}`}>{stripSeriesPrefix(part.title, series.name)}</Link>
              </li>
            ))}
            {series.count > series.parts.length && (
              <li className="series-card__more">
                <Link href={href}>还有 {series.count - series.parts.length} 篇，查看完整目录</Link>
              </li>
            )}
          </ol>
        )}
        <footer className="post-card__foot">
          <div className="post-card__tags">
            {series.category && <Link href={`/categories/${series.category.slug}`}>#{series.category.name}</Link>}
          </div>
          <Link href={`/posts/${series.first.slug}`} className="text-link series-card__start">
            从第 1 篇读起
          </Link>
        </footer>
      </div>
    </article>
  )
}
