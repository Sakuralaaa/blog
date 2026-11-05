import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { isSafeImageSrc, isValidHref } from '@/lib/utils'

export interface ProjectEntry {
  id: string
  name: string
  url: string
  description: string | null
  image: string | null
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function ProjectCard({ project, priority = false }: { project: ProjectEntry; priority?: boolean }) {
  const external = isValidHref(project.url)
  const internal = !external && /^\/(?!\/)/.test(project.url)
  const href = external || internal ? project.url : ''
  const host = external ? hostLabel(project.url) : ''
  const initial = Array.from(project.name.trim())[0]?.toUpperCase() || '作'
  const body = (
    <>
      <div className="project-card__cover">
        {isSafeImageSrc(project.image) ? (
          <img
            src={project.image}
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
        <span className="project-card__meta">
          {host && <span>{host}</span>}
          {href && <ArrowUpRight size={16} aria-hidden="true" />}
        </span>
      </div>
    </>
  )
  if (!href) {
    return (
      <article className="card project-card">
        {body}
      </article>
    )
  }
  return (
    <article className="card card--hover project-card">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="project-card__link">
          {body}
        </a>
      ) : (
        <Link href={href} className="project-card__link">
          {body}
        </Link>
      )}
    </article>
  )
}
