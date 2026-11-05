import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

/** Home "recent comments" section; renders nothing when there is nothing to show. */
export async function RecentCommentsTimeline({ limit = 4 }: { limit?: number } = {}) {
  const commentsEnabled = (await getSetting<boolean>('comments.enabled', true)) ?? true
  if (!commentsEnabled) return null

  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 10) : 4
  const comments = await prisma.comment.findMany({
    where: { status: 'APPROVED', post: { isProtected: false, status: 'PUBLISHED' } },
    orderBy: { createdAt: 'desc' },
    take: safeLimit,
    select: {
      id: true,
      content: true,
      createdAt: true,
      authorName: true,
      author: { select: { name: true } },
      post: { select: { title: true, slug: true } },
    },
  })

  if (comments.length === 0) return null

  return (
    <section className="home-section container" aria-labelledby="recent-comments-title">
      <header className="section-head">
        <h2 id="recent-comments-title">最新评论</h2>
      </header>
      <ul className="comment-feed">
        {comments.map((comment) => {
          const author = comment.author?.name || comment.authorName || '匿名用户'
          const summary =
            comment.content.length > 80 ? `${comment.content.slice(0, 80)}…` : comment.content
          return (
            <li key={comment.id} className="card comment-feed__item">
              <p className="comment-feed__meta">
                <strong>{author}</strong>
                <span>
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </p>
              <p className="comment-feed__text">{summary}</p>
              <Link href={`/posts/${comment.post.slug}`} className="comment-feed__post">
                {comment.post.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
