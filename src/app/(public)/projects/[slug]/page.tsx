import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, ArrowUpRight, Calendar, Images, UserRound } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { MDXContent } from '@/components/posts/mdx-content'
import { ArticleImages } from '@/components/posts/article-images'
import { isSafeImageSrc, isValidHref } from '@/lib/utils'
import { parseGallery, parseTags, projectPath } from '@/lib/projects'
import { toCanonicalPath } from '@/lib/seo'

export const revalidate = 60
export const dynamicParams = true

type Props = { params: Promise<{ slug: string }> }

const getProject = cache(async (key: string) => {
  const decoded = decodeURIComponent(key).toLowerCase()
  return (
    (await prisma.project.findUnique({ where: { slug: decoded } })) ??
    (await prisma.project.findUnique({ where: { id: decodeURIComponent(key) } }))
  )
})

export async function generateStaticParams() {
  return []
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) return { title: '作品未找到' }
  const path = toCanonicalPath(projectPath(project))
  const description = project.description || project.name
  const images = [
    {
      url: `/api/og/projects/${encodeURIComponent(project.slug || project.id)}?v=${new Date(project.updatedAt).getTime()}`,
      width: 1200,
      height: 630,
      alt: project.name,
    },
  ]
  return {
    title: project.name,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'article', url: path, title: project.name, description, images },
    twitter: { card: 'summary_large_image', title: project.name, description, images },
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const project = await getProject(slug)
  if (!project) notFound()
  // A work with a slug lives at that slug; its id URL forwards there.
  if (project.slug && decodeURIComponent(slug).toLowerCase() !== project.slug) {
    permanentRedirect(projectPath(project))
  }

  const [newer, older] = await Promise.all([
    prisma.project.findFirst({
      where: { createdAt: { gt: project.createdAt } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, name: true },
    }),
    prisma.project.findFirst({
      where: { createdAt: { lt: project.createdAt } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, name: true },
    }),
  ])

  const cover = isSafeImageSrc(project.image) ? project.image : null
  const tags = parseTags(project.tags)
  const gallery = parseGallery(project.gallery)
  const external = isValidHref(project.url) && !project.url.startsWith('mailto:')
  const internal = !external && /^\/(?!\/)/.test(project.url)
  const host = external ? hostLabel(project.url) : ''

  return (
    <div className="article project-detail">
      <header className="article-head container">
        <Link href="/projects" className="article-head__back">
          <ArrowLeft size={15} aria-hidden="true" />
          作品
        </Link>
        <h1>{project.name}</h1>
        {project.description && <p className="article-head__excerpt">{project.description}</p>}
        {(project.role || project.period || gallery.length > 0) && (
          <div className="article-head__meta project-detail__facts">
            {project.role && (
              <span>
                <UserRound size={14} aria-hidden="true" />
                {project.role}
              </span>
            )}
            {project.period && (
              <span>
                <Calendar size={14} aria-hidden="true" />
                {project.period}
              </span>
            )}
            {gallery.length > 0 && (
              <span>
                <Images size={14} aria-hidden="true" />
                {gallery.length} 张截图
              </span>
            )}
          </div>
        )}
        {tags.length > 0 && (
          <div className="article-head__tags">
            {tags.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>
        )}
        {(external || internal) && (
          <div className="project-detail__actions">
            {external ? (
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                访问作品 <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ) : (
              <Link href={project.url} className="btn btn--primary">
                访问作品 <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            )}
            {host && <span className="project-detail__host">{host}</span>}
          </div>
        )}
      </header>

      <div className="article-body container">
        <div className="article-main">
          {cover && (
            <figure className="article-cover project-detail__cover">
              <img src={cover} alt={project.name} loading="eager" decoding="async" />
            </figure>
          )}

          {project.content && (
            <div className="card article-content">
              <MDXContent content={project.content} />
            </div>
          )}

          {gallery.length > 0 && (
            <section className="project-detail__gallery" aria-labelledby="project-gallery">
              <h2 id="project-gallery">截图</h2>
              <ArticleImages>
                <div className="project-gallery">
                  {gallery.map((src, index) => (
                    <figure key={`${src}-${index}`} className="project-gallery__item">
                      <img src={src} alt={`${project.name} 截图 ${index + 1}`} loading="lazy" decoding="async" />
                    </figure>
                  ))}
                </div>
              </ArticleImages>
            </section>
          )}

          {(newer || older) && (
            <nav className="article-pager" aria-label="上一个和下一个作品">
              {newer ? (
                <Link href={projectPath(newer)} className="card card--hover">
                  <span>
                    <ArrowLeft size={14} aria-hidden="true" /> 上一个
                  </span>
                  <strong>{newer.name}</strong>
                </Link>
              ) : (
                <span />
              )}
              {older ? (
                <Link href={projectPath(older)} className="card card--hover article-pager__next">
                  <span>
                    下一个 <ArrowRight size={14} aria-hidden="true" />
                  </span>
                  <strong>{older.name}</strong>
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
