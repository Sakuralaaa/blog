import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Calendar, Clock, Edit3, Eye, Lock } from 'lucide-react'
import { TableOfContents, type HeadingItem } from '@/components/posts/table-of-contents'
import { RelatedPostsList, type RelatedPostsListItem } from '@/components/posts/related-posts-list'
import { isInternalImageUrl } from '@/lib/image-url'
import { isSafeImageSrc } from '@/lib/utils'

type SimplePost = { id: string; title: string; slug: string } | null

/** Shared article chrome for public and password-protected posts. */
export function ArticleLayout({
  post,
  publishedLabel,
  updatedLabel,
  views,
  headings,
  prevPost,
  nextPost,
  relatedPosts,
  author,
  children,
  comments,
}: {
  post: {
    title: string
    excerpt: string | null
    coverImage: string | null
    readingTime: number | null
    isProtected: boolean
    category: { name: string; slug: string } | null
    postTags: { tag: { id: string; name: string; slug: string } }[]
  }
  publishedLabel: string
  updatedLabel: string | null
  views: ReactNode
  headings: HeadingItem[]
  prevPost: SimplePost
  nextPost: SimplePost
  relatedPosts: RelatedPostsListItem[]
  author: { name: string; role: string; avatar: string }
  children: ReactNode
  comments?: ReactNode
}) {
  const cover = isSafeImageSrc(post.coverImage) ? post.coverImage : null
  return (
    <div className="article">
      <header className="article-head container">
        <Link href="/posts" className="article-head__back">
          <ArrowLeft size={15} aria-hidden="true" />
          文章
        </Link>
        {post.category && (
          <Link href={`/categories/${post.category.slug}`} className="chip chip--hi article-head__cat">
            {post.category.name}
          </Link>
        )}
        <h1>{post.title}</h1>
        {post.excerpt && <p className="article-head__excerpt">{post.excerpt}</p>}
        <div className="article-head__meta">
          {author.name && <span>{author.name}</span>}
          {publishedLabel && (
            <span>
              <Calendar size={14} aria-hidden="true" />
              <time>{publishedLabel}</time>
            </span>
          )}
          <span>
            <Clock size={14} aria-hidden="true" />
            {post.readingTime || 1} 分钟
          </span>
          <span>
            <Eye size={14} aria-hidden="true" />
            {views} 次阅读
          </span>
          {updatedLabel && (
            <span className="article-head__updated">
              <Edit3 size={14} aria-hidden="true" />
              编辑于 {updatedLabel}
            </span>
          )}
          {post.isProtected && (
            <span className="article-head__lock">
              <Lock size={14} aria-hidden="true" />
              加密文章
            </span>
          )}
        </div>
        {post.postTags.length > 0 && (
          <div className="article-head__tags">
            {post.postTags.map((pt) => (
              <Link key={pt.tag.id} href={`/tags/${pt.tag.slug}`} className="chip">
                #{pt.tag.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="article-body container" data-toc={headings.length > 0 || undefined}>
        <div className="article-main">
          {cover && (
            <figure className="article-cover">
              {isInternalImageUrl(cover) ? (
                <Image
                  src={cover}
                  alt={post.title}
                  width={1600}
                  height={900}
                  priority
                  sizes="(min-width: 1024px) 760px, 100vw"
                />
              ) : (
                <img src={cover} alt={post.title} loading="eager" decoding="async" />
              )}
            </figure>
          )}

          <div className="card article-content">{children}</div>

          {(prevPost || nextPost) && (
            <nav className="article-pager" aria-label="上一篇和下一篇">
              {prevPost ? (
                <Link href={`/posts/${prevPost.slug}`} className="card card--hover">
                  <span>
                    <ArrowLeft size={14} aria-hidden="true" /> 上一篇
                  </span>
                  <strong>{prevPost.title}</strong>
                </Link>
              ) : (
                <span />
              )}
              {nextPost ? (
                <Link href={`/posts/${nextPost.slug}`} className="card card--hover article-pager__next">
                  <span>
                    下一篇 <ArrowRight size={14} aria-hidden="true" />
                  </span>
                  <strong>{nextPost.title}</strong>
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}

          {comments}
        </div>

        <aside className="article-aside">
          <div className="article-aside__sticky">
            <TableOfContents headings={headings} />
            {(author.name || author.role) && (
              <div className="card aside-card aside-author">
                <span className="aside-author__avatar" aria-hidden="true">
                  {isSafeImageSrc(author.avatar) ? (
                    <img src={author.avatar} alt="" />
                  ) : (
                    Array.from(author.name || '作')[0]
                  )}
                </span>
                <div>
                  <strong>{author.name}</strong>
                  {author.role && <span>{author.role}</span>}
                </div>
              </div>
            )}
            {relatedPosts.length > 0 && (
              <div className="card aside-card">
                <h2 className="aside-card__title">相关文章</h2>
                <RelatedPostsList posts={relatedPosts} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
