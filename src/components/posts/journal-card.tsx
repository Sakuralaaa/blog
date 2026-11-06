import Link from 'next/link'
import { Eye } from 'lucide-react'
import { PostMeta } from './post-meta'
import { isSafeImageSrc } from '@/lib/utils'
import { seriesHref } from '@/lib/post-series'
import { CARD_SIZES, mediaSrcSet } from '@/lib/media-srcset'

export interface JournalEntry {
  id: string
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  publishedAt: Date | string | null
  readingTime: number | null
  isProtected: boolean
  author: { name: string | null }
  category: { name: string; slug: string } | null
  postTags: { tag: { id: string; slug: string; name: string } }[]
  viewCount: { count: number | null } | null
  series?: string | null
  seriesOrder?: number | null
}

export function JournalCard({
  post,
  featured = false,
  hideTagId,
}: {
  post: JournalEntry
  featured?: boolean
  hideTagId?: string
}) {
  const cover = !post.isProtected && isSafeImageSrc(post.coverImage) ? post.coverImage : null
  const tags = post.postTags.filter(({ tag }) => tag.id !== hideTagId).slice(0, 3)
  return (
    <article
      className="card card--hover post-card"
      data-featured={featured || undefined}
      data-cover={cover ? 'true' : undefined}
     
    >
      {cover && (
        <Link href={`/posts/${post.slug}`} className="post-card__cover" tabIndex={-1} aria-hidden="true">
          <img
            src={cover}
            srcSet={mediaSrcSet(cover)}
            sizes={CARD_SIZES}
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
          {post.category && (
            <Link href={`/categories/${post.category.slug}`} className="chip chip--hi">
              {post.category.name}
            </Link>
          )}
          <PostMeta
            publishedAt={post.publishedAt}
            readingTime={post.readingTime}
            isProtected={post.isProtected}
          />
        </div>
        {post.series && (
          <Link href={seriesHref(post.series)} className="post-card__series">
            <span>系列</span>
            {post.series}
            {post.seriesOrder ? <em>{String(post.seriesOrder).padStart(2, '0')}</em> : null}
          </Link>
        )}
        <h3 className="post-card__title">
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.excerpt && <p className="post-card__excerpt">{post.excerpt}</p>}
        <footer className="post-card__foot">
          <div className="post-card__tags">
            {tags.map(({ tag }) => (
              <Link key={tag.id} href={`/tags/${tag.slug}`}>
                #{tag.name}
              </Link>
            ))}
          </div>
          <span className="post-card__views" aria-label={`${post.viewCount?.count || 0} 次阅读`}>
            <Eye size={14} aria-hidden="true" />
            {post.viewCount?.count || 0}
          </span>
        </footer>
      </div>
    </article>
  )
}
