'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Lock } from 'lucide-react'

export type RelatedPostsListItem = {
  id: string
  title: string
  slug: string
  publishedLabel: string
  isProtected?: boolean
  viewCount?: {
    count: number
  } | null
}

function buildInitialCounts(posts: RelatedPostsListItem[]) {
  return Object.fromEntries(posts.map((post) => [post.slug, post.viewCount?.count || 0] as const))
}

export function RelatedPostsList({ posts }: { posts: RelatedPostsListItem[] }) {
  const [counts, setCounts] = useState<Record<string, number>>(() => buildInitialCounts(posts))
  const slugKey = useMemo(() => posts.map((post) => post.slug).join(','), [posts])

  useEffect(() => {
    setCounts(buildInitialCounts(posts))
  }, [posts])

  useEffect(() => {
    const slugs = Array.from(new Set(posts.map((post) => post.slug.trim()).filter(Boolean)))
    if (slugs.length === 0) {
      return
    }

    const controller = new AbortController()

    void fetch(`/api/posts/views?slugs=${encodeURIComponent(slugs.join(','))}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || typeof data !== 'object' || !('counts' in data)) {
          return
        }

        const nextCounts = data.counts
        if (!nextCounts || typeof nextCounts !== 'object') {
          return
        }

        setCounts((current) => {
          const merged = { ...current }
          for (const slug of slugs) {
            const value = (nextCounts as Record<string, unknown>)[slug]
            if (typeof value === 'number' && Number.isFinite(value)) {
              merged[slug] = value
            }
          }
          return merged
        })
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      })

    return () => {
      controller.abort()
    }
  }, [posts, slugKey])

  return (
    <ul className="related-list">
      {posts.map((related) => (
        <li key={related.id}>
          <Link href={`/posts/${related.slug}`}>
            <strong>{related.title}</strong>
            <span>
              {related.publishedLabel}
              <Eye size={12} aria-hidden="true" />
              {counts[related.slug] ?? related.viewCount?.count ?? 0}
              {related.isProtected && (
                <>
                  <Lock size={12} aria-hidden="true" />
                  加密
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
