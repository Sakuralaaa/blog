import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { HeroSection } from '@/components/home/hero-section'
import { getPublicSettings } from '@/lib/settings'
import { RecentCommentsTimeline } from '@/components/comments/recent-comments-timeline'
import { JournalCard } from '@/components/posts/journal-card'
import { ProjectCard } from '@/components/projects/project-card'

export const revalidate = 60

export const metadata: Metadata = {
  title: '首页',
  description: '作品、项目与文章。',
  alternates: {
    canonical: '/',
  },
}

export default async function HomePage() {
  const [settings, projects, latestPosts] = await Promise.all([
    getPublicSettings(),
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, url: true, description: true, image: true },
    }),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
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
  ])

  return (
    <div className="home">
      <HeroSection settings={settings} />

      {projects.length > 0 && (
        <section id="projects" className="home-section container" aria-labelledby="home-projects">
          <header className="section-head">
            <h2 id="home-projects">精选作品</h2>
            <Link href="/projects" className="text-link">
              全部作品 <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </header>
          <div className="project-grid">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} priority={index < 3} />
            ))}
          </div>
        </section>
      )}

      <section id="latest-posts" className="home-section container" aria-labelledby="home-posts">
        <header className="section-head">
          <h2 id="home-posts">最新文章</h2>
          <Link href="/posts" className="text-link">
            全部文章 <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </header>
        {latestPosts.length === 0 ? (
          <div className="card empty-state">
            <BookOpen size={24} aria-hidden="true" />
            <p>这里还没有文章。</p>
          </div>
        ) : (
          <div className="post-grid">
            {latestPosts.map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <RecentCommentsTimeline />
    </div>
  )
}
