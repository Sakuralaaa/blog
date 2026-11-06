import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { HeroSection } from '@/components/home/hero-section'
import { getPublicSettings } from '@/lib/settings'
import { RecentCommentsTimeline } from '@/components/comments/recent-comments-timeline'
import { JournalCard } from '@/components/posts/journal-card'
import { ShowcaseMarquee, type ShowcaseItem } from '@/components/home/showcase-marquee'
import { projectPath } from '@/lib/projects'
import { collapseSeriesPosts, getSeriesSummaries } from '@/lib/series-groups'
import { SeriesCard } from '@/components/posts/series-card'
import { seriesHref } from '@/lib/post-series'

// 动态渲染：避免 Docker 构建时用空模板库预渲染的页面在重启后被当作旧缓存返回
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '首页',
  description: '作品、项目与文章。',
  alternates: {
    canonical: '/',
  },
}

export default async function HomePage() {
  const [settings, projects, showcasePosts, latestPosts, seriesList] = await Promise.all([
    getPublicSettings(),
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, slug: true, name: true, description: true, image: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 40,
      select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true, createdAt: true, isProtected: true, series: true },
    }),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        series: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        readingTime: true,
        isProtected: true,
        author: { select: { name: true } },
        category: { select: { id: true, name: true, slug: true } },
        series: true,
        seriesOrder: true,
        postTags: {
          select: { tag: { select: { id: true, name: true, slug: true } } },
          take: 5,
        },
        viewCount: { select: { count: true } },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 6,
    }),
    getSeriesSummaries(),
  ])
  const seriesByName = new Map(seriesList.map((item) => [item.name, item]))

  // A post that introduces a work (same slug or same cover image) is the same card twice
  // in the strip; keep the work and drop its write-up.
  const workSlugs = new Set(projects.map((project) => project.slug).filter(Boolean))
  const workImages = new Set(projects.map((project) => project.image?.trim()).filter(Boolean))
  const isWorkWriteUp = (post: { slug: string; coverImage: string | null }) =>
    workSlugs.has(post.slug) || Boolean(post.coverImage && workImages.has(post.coverImage.trim()))

  const showcase: ShowcaseItem[] = [
    ...projects.map((project) => ({
      date: project.createdAt.getTime(),
      item: {
        key: `work-${project.id}`,
        kind: 'work' as const,
        title: project.name,
        subtitle: project.description,
        image: project.image,
        href: projectPath(project),
      },
    })),
    ...collapseSeriesPosts(showcasePosts.filter((post) => !isWorkWriteUp(post)))
      .slice(0, 12)
      .map((post) => {
        const series = post.series ? seriesByName.get(post.series) : undefined
        return {
          date: (post.publishedAt ?? post.createdAt).getTime(),
          item: series
            ? {
                key: `series-${series.name}`,
                kind: 'post' as const,
                title: `专题 · ${series.name}`,
                subtitle: `共 ${series.count} 篇`,
                image: series.first.isProtected ? null : series.first.coverImage,
                href: seriesHref(series.name),
              }
            : {
                key: `post-${post.id}`,
                kind: 'post' as const,
                title: post.title,
                subtitle: post.isProtected ? null : post.excerpt,
                image: post.coverImage,
                href: `/posts/${post.slug}`,
              },
        }
      }),
  ]
    .sort((a, b) => b.date - a.date)
    .map(({ item }) => item)

  return (
    <div className="home">
      <HeroSection settings={settings} />

      {showcase.length > 0 && (
        <section id="projects" className="home-section home-showcase" aria-labelledby="home-showcase">
          <header className="section-head container">
            <h2 id="home-showcase">作品与文章</h2>
            <span className="section-head__links">
              <Link href="/projects" className="text-link">
                全部作品 <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/posts" className="text-link">
                全部文章 <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </span>
          </header>
          <ShowcaseMarquee items={showcase} label="作品与文章" />
        </section>
      )}

      <section id="latest-posts" className="home-section container" aria-labelledby="home-posts">
        <header className="section-head">
          <h2 id="home-posts">最新文章</h2>
          <Link href="/posts" className="text-link">
            全部文章 <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </header>
        {latestPosts.length === 0 && seriesList.length === 0 ? (
          <div className="card empty-state">
            <BookOpen size={24} aria-hidden="true" />
            <p>这里还没有文章。</p>
          </div>
        ) : (
          <div className="post-grid">
            {seriesList.slice(0, 2).map((item) => (
              <SeriesCard key={`series-${item.name}`} series={item} />
            ))}
            {latestPosts.slice(0, Math.max(0, 6 - Math.min(seriesList.length, 2))).map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <RecentCommentsTimeline />
    </div>
  )
}
