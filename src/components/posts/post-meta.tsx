import { Calendar, Clock, Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface PostMetaProps {
  publishedAt?: Date | string | null
  authorName?: string | null
  readingTime?: number | null
  isProtected?: boolean | null
}

export function PostMeta({ publishedAt, authorName, readingTime, isProtected }: PostMetaProps) {
  const publishedLabel = publishedAt
    ? formatDistanceToNow(new Date(publishedAt), {
        addSuffix: true,
        locale: zhCN,
      }).replace(/^大约\s*/, '')
    : ''

  return (
    <div className="post-meta">
      {publishedLabel && (
        <span>
          <Calendar size={13} aria-hidden="true" />
          <time dateTime={publishedAt ? new Date(publishedAt).toISOString() : undefined}>
            {publishedLabel}
          </time>
        </span>
      )}
      {authorName && <span>{authorName}</span>}
      <span>
        <Clock size={13} aria-hidden="true" />
        {readingTime || 1} 分钟
      </span>
      {isProtected && (
        <span className="post-meta__lock">
          <Lock size={13} aria-hidden="true" />
          加密
        </span>
      )}
    </div>
  )
}
