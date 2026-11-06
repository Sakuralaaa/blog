import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MDXContent } from '@/components/posts/mdx-content'
import { format } from 'date-fns'
import { type HeadingItem } from '@/components/posts/table-of-contents'
import { ArticleLayout } from '@/components/posts/article-layout'
import { CommentSection } from '@/components/comments/comment-section'
import { PostTitleSync } from '@/components/posts/post-title-sync'
import { getPostPageSettings } from '@/lib/settings'
import { ViewCount } from '@/components/posts/view-count'
import { extractHeadingsFromMarkdown, stripLeadingTitle } from '@/lib/markdown'
import { ProtectedPostPage } from '@/components/posts/protected-post-page'
import { toCanonicalPath } from '@/lib/seo'
import { seriesNeighbours, type SeriesNavData } from '@/components/posts/series-nav'
import {
  getPublicPostPageData,
  getPublishedPostBySlug,
  getPublishedPostSlugs,
} from '@/lib/public-post-page'

export const revalidate = false
export const dynamicParams = true

interface PostPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  const posts = await getPublishedPostSlugs()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params

  const postPageSettings = await getPostPageSettings()
  const commentsEnabled = postPageSettings.commentsEnabled
  const allowGuest = postPageSettings.allowGuest
  const ownerName = postPageSettings.ownerName
  const defaultAvatarUrl = postPageSettings.defaultAvatarUrl
  const ownerRole = postPageSettings.ownerRole

  const formatPublishedAtLabel = (value: string | Date | null | undefined) => {
    if (!value) return ''
    return format(new Date(value), 'yyyy-MM-dd HH:mm')
  }

  const formatUpdatedAtLabel = (
    updatedAt: string | Date | null | undefined,
    publishedAt: string | Date | null | undefined
  ) => {
    if (!updatedAt || !publishedAt) return null
    if (new Date(updatedAt).getTime() - new Date(publishedAt).getTime() <= 60000) return null
    return format(new Date(updatedAt), 'yyyy-MM-dd HH:mm')
  }

  const postData = await getPublicPostPageData(slug)

  if (!postData) {
    notFound()
  }

  const { post: basePost, relatedPosts, seriesPosts } = postData
  const series: SeriesNavData | null =
    basePost.series && seriesPosts.length > 1
      ? { name: basePost.series, currentSlug: basePost.slug, posts: seriesPosts }
      : null
  const inSeries = seriesNeighbours(series)
  const prevPost = inSeries ? inSeries.prevPost : postData.prevPost
  const nextPost = inSeries ? inSeries.nextPost : postData.nextPost

  if (basePost.isProtected) {
    const { content, ...safePost } = basePost
    void content
    const safePostWithLabels = {
      ...safePost,
      publishedLabel: formatPublishedAtLabel(safePost.publishedAt),
      updatedAtLabel: formatUpdatedAtLabel(safePost.updatedAt, safePost.publishedAt),
    }
    const relatedPostsWithLabels = relatedPosts.map((item) => ({
      ...item,
      publishedLabel: formatPublishedAtLabel(item.publishedAt),
    }))
    return (
      <ProtectedPostPage
        post={safePostWithLabels}
        prevPost={prevPost}
        nextPost={nextPost}
        relatedPosts={relatedPostsWithLabels}
        commentsEnabled={commentsEnabled}
        allowGuest={!!allowGuest}
        ownerName={ownerName}
        ownerRole={ownerRole}
        defaultAvatarUrl={defaultAvatarUrl || ''}
        series={series}
      />
    )
  }

  const content = stripLeadingTitle(basePost.content || '', basePost.title)
  const post = { ...basePost, content }
  const relatedPostsWithLabels = relatedPosts.map((item) => ({
    ...item,
    publishedLabel: formatPublishedAtLabel(item.publishedAt),
  }))

  const headings: HeadingItem[] = extractHeadingsFromMarkdown(post.content, 3).map(
    (heading, index) => ({
      id: `heading-${index}`,
      text: heading.text,
      level: heading.level,
    })
  )

  return (
    <>
      <PostTitleSync title={post.title} minutes={post.readingTime || 1} />
      <ArticleLayout
        post={post}
        publishedLabel={formatPublishedAtLabel(post.publishedAt)}
        updatedLabel={formatUpdatedAtLabel(post.updatedAt, post.publishedAt)}
        views={<ViewCount slug={slug} initialCount={post.viewCount?.count || 0} />}
        headings={headings}
        prevPost={prevPost}
        nextPost={nextPost}
        relatedPosts={relatedPostsWithLabels}
        series={series}
        author={{
          name: ownerName || post.author.name || '',
          role: ownerRole,
          avatar: defaultAvatarUrl || post.author.image || '',
        }}
        comments={
          commentsEnabled ? (
            <CommentSection
              postSlug={slug}
              allowGuest={!!allowGuest}
              defaultAvatarUrl={defaultAvatarUrl || undefined}
            />
          ) : null
        }
      >
        <MDXContent content={post.content} />
      </ArticleLayout>
    </>
  )
}

// 生成元数据
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params

  const post = await getPublishedPostBySlug(slug)

  if (!post) {
    return {
      title: '文章未找到',
    }
  }

  return {
    title: post.title,
    description: post.excerpt || post.title,
    alternates: {
      canonical: toCanonicalPath(`/posts/${slug}`),
    },
    openGraph: {
      type: 'article',
      url: toCanonicalPath(`/posts/${slug}`),
      title: post.title,
      description: post.excerpt || post.title,
      images: post.coverImage ? [post.coverImage] : [],
    },
    twitter: {
      card: post.coverImage ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.excerpt || post.title,
      images: post.coverImage ? [post.coverImage] : [],
    },
  }
}
