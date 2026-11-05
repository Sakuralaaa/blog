import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { LayoutGrid } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ProjectCard } from '@/components/projects/project-card'

export const revalidate = 60

export const metadata: Metadata = {
  title: '作品',
  description: '作品与项目展示。',
  alternates: {
    canonical: '/projects',
  },
}

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, url: true, description: true, image: true },
  })

  return (
    <div className="page">
      <PageHeader
        eyebrow="Projects"
        title="作品"
        description={projects.length > 0 ? `共 ${projects.length} 个作品与项目` : undefined}
      />
      <section className="container page-body">
        {projects.length === 0 ? (
          <div className="card empty-state">
            <LayoutGrid size={24} aria-hidden="true" />
            <p>暂无作品，稍后再来看看吧。</p>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} priority={index < 3} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
