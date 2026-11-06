import { getPublishedPostBySlug } from '@/lib/public-post-page'
import { getSetting } from '@/lib/settings'
import { formatOgDate, renderOgCard } from '@/lib/og-card'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, siteName] = await Promise.all([
    getPublishedPostBySlug(decodeURIComponent(slug)),
    getSetting<string>('site.title', '个人主页'),
  ])
  if (!post) return new Response('Not found', { status: 404 })

  const chips: string[] = []
  if (post.series) chips.push(post.seriesOrder ? `${post.series} · ${post.seriesOrder}` : post.series)
  for (const { tag } of post.postTags) chips.push(`#${tag.name}`)

  const meta = [formatOgDate(post.publishedAt)]
  if (post.readingTime) meta.push(`${post.readingTime} 分钟`)

  return renderOgCard({
    siteName: siteName || '个人主页',
    kicker: post.category?.name,
    title: post.title,
    description: post.isProtected ? '这篇文章需要密码访问' : post.excerpt,
    chips,
    meta,
  })
}
