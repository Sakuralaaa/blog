import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { getSiteUrl } from '@/lib/seo'
import { buildRssXml } from '@/lib/feed'
import { POSTS_LIST_CACHE_TAG } from '@/lib/public-post-page'

export const revalidate = 3600

const FEED_LIMIT = 30

const getFeedPosts = unstable_cache(
  async () =>
    prisma.post.findMany({
      where: { status: 'PUBLISHED', isProtected: false },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        postTags: { select: { tag: { select: { name: true } } } },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: FEED_LIMIT,
    }),
  ['rss-feed-posts'],
  { revalidate, tags: [POSTS_LIST_CACHE_TAG] }
)

export async function GET() {
  const [posts, title, description] = await Promise.all([
    getFeedPosts(),
    getSetting<string>('site.title', '个人主页'),
    getSetting<string>('site.description', '作品、项目与文章'),
  ])
  const siteUrl = getSiteUrl().origin
  const xml = buildRssXml(
    {
      title: title || '个人主页',
      description: description || '作品、项目与文章',
      siteUrl,
      feedUrl: `${siteUrl}/feed.xml`,
    },
    posts.map((post) => ({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      category: post.category?.name,
      tags: post.postTags.map((item) => item.tag.name),
    }))
  )

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    },
  })
}
