import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { isSafeImageSrc } from '@/lib/utils'
import { parseTags, projectPath } from '@/lib/projects'
import { CARD_SIZES, mediaSrcSet } from '@/lib/media-srcset'

export interface ProjectEntry {
  id: string
  slug: string | null
  name: string
  description: string | null
  image: string | null
  role: string | null
  period: string | null
  tags: string | null
}

export const PROJECT_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  image: true,
  role: true,
  period: true,
  tags: true,
} as const

export function ProjectCard({ project, priority = false }: { project: ProjectEntry; priority?: boolean }) {
  const initial = Array.from(project.name.trim())[0]?.toUpperCase() || '作'
  const meta = [project.role, project.period].filter(Boolean).join(' · ')
  const tags = parseTags(project.tags).slice(0, 3)
  return (
    <article className="card card--hover project-card">
      <Link href={projectPath(project)} className="project-card__link">
        <div className="project-card__cover">
          {isSafeImageSrc(project.image) ? (
            <img
              src={project.image}
              srcSet={mediaSrcSet(project.image)}
              sizes={CARD_SIZES}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
            />
          ) : (
            <span className="project-card__placeholder" aria-hidden="true">
              {initial}
            </span>
          )}
        </div>
        <div className="project-card__body">
          <h3>{project.name}</h3>
          {project.description && <p>{project.description}</p>}
          {tags.length > 0 && (
            <span className="project-card__tags">
              {tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </span>
          )}
          <span className="project-card__meta">
            {meta && <span>{meta}</span>}
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  )
}
