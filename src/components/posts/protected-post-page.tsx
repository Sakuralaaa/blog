'use client'

import { useCallback, useEffect, useState } from 'react'
import { type HeadingItem } from '@/components/posts/table-of-contents'
import { ArticleLayout } from '@/components/posts/article-layout'
import { CommentSection } from '@/components/comments/comment-section'
import { PostTitleSync } from '@/components/posts/post-title-sync'
import { PostPasswordGate } from '@/components/posts/post-password-gate'
import { ViewCount } from '@/components/posts/view-count'
import { extractHeadingsFromMarkdown, stripLeadingTitle } from '@/lib/markdown'
import { MDXContentClient } from '@/components/posts/mdx-content-client'

const UNLOCK_STORAGE_PREFIX = 'pg_post_unlock_'

type PostTagItem = {
  tag: {
    id: string
    name: string
    slug: string
  }
}

type ProtectedPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  publishedLabel: string
  updatedAtLabel: string | null
  publishedAt: string | Date | null
  updatedAt: string | Date
  readingTime: number | null
  categoryId: string | null
  isProtected: boolean
  author: { name: string | null; image: string | null }
  category: { name: string; slug: string } | null
  postTags: PostTagItem[]
  viewCount: { count: number } | null
}

type RelatedPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  publishedLabel: string
  publishedAt: string | Date | null
  isProtected?: boolean
  viewCount?: { count: number } | null
}

type SimplePost = { id: string; title: string; slug: string } | null

interface ProtectedPostPageProps {
  post: ProtectedPost
  prevPost: SimplePost
  nextPost: SimplePost
  relatedPosts: RelatedPost[]
  commentsEnabled: boolean
  allowGuest: boolean
  ownerName: string
  ownerRole: string
  defaultAvatarUrl: string
}

function getStorageKey(postId: string) {
  return `${UNLOCK_STORAGE_PREFIX}${postId}`
}

export function ProtectedPostPage({
  post,
  prevPost,
  nextPost,
  relatedPosts,
  commentsEnabled,
  allowGuest,
  ownerName,
  ownerRole,
  defaultAvatarUrl,
}: ProtectedPostPageProps) {
  const [content, setContent] = useState<string | null>(null)
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [unlockToken, setUnlockToken] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadContent = useCallback(
    async (token = '') => {
      setFetching(true)
      setLoadError('')
      try {
        const res = await fetch(`/api/posts/protected?slug=${post.slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            try {
              sessionStorage.removeItem(getStorageKey(post.id))
            } catch {
              // ignore
            }
            setUnlockToken(null)
          }
          setContent(null)
          setLoadError(token ? data.error || '解锁已失效，请重新输入密码' : '')
          return
        }
        const nextContent = stripLeadingTitle(
          typeof data.content === 'string' ? data.content : '',
          post.title
        )
        setContent(nextContent)
        const nextHeadings = extractHeadingsFromMarkdown(nextContent, 3).map((heading, index) => ({
          id: `heading-${index}`,
          text: heading.text,
          level: heading.level,
        }))
        setHeadings(nextHeadings)
      } catch (error) {
        console.error('加载受保护内容失败:', error)
        setLoadError('加载内容失败，请稍后重试')
      } finally {
        setFetching(false)
      }
    },
    [post.id, post.slug, post.title]
  )

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(getStorageKey(post.id))
      if (stored) setUnlockToken(stored)
      loadContent(stored || '')
    } catch {
      // ignore
    }
  }, [post.id, loadContent])

  const handleUnlock = useCallback(
    (payload: { token?: string }) => {
      if (!payload.token) return
      try {
        sessionStorage.setItem(getStorageKey(post.id), payload.token)
      } catch {
        // ignore
      }
      setUnlockToken(payload.token)
      loadContent(payload.token)
    },
    [post.id, loadContent]
  )

  const canShowContent = content !== null

  return (
    <>
      <PostTitleSync title={post.title} minutes={post.readingTime || 1} />
      <ArticleLayout
        post={post}
        publishedLabel={post.publishedLabel}
        updatedLabel={post.updatedAtLabel}
        views={
          canShowContent ? (
            <ViewCount slug={post.slug} initialCount={post.viewCount?.count || 0} />
          ) : (
            <ViewCount slug={post.slug} initialCount={post.viewCount?.count || 0} mode="read" />
          )
        }
        headings={headings}
        prevPost={prevPost}
        nextPost={nextPost}
        relatedPosts={relatedPosts}
        author={{
          name: ownerName || post.author.name || '',
          role: ownerRole,
          avatar: defaultAvatarUrl || post.author.image || '',
        }}
        comments={
          commentsEnabled && canShowContent ? (
            <CommentSection
              postSlug={post.slug}
              allowGuest={!!allowGuest}
              defaultAvatarUrl={defaultAvatarUrl || undefined}
              unlockToken={unlockToken || undefined}
            />
          ) : null
        }
      >
        {canShowContent ? (
          <MDXContentClient content={content} />
        ) : (
          <>
            <PostPasswordGate
              slug={post.slug}
              title={post.title}
              excerpt={post.excerpt}
              onUnlock={handleUnlock}
            />
            {fetching && <p className="article-status">正在加载内容…</p>}
            {loadError && (
              <p className="article-status article-status--error" role="alert">
                {loadError}
              </p>
            )}
          </>
        )}
      </ArticleLayout>
    </>
  )
}
