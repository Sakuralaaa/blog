import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { parseTags } from '@/lib/projects'
import { renderOgCard } from '@/lib/og-card'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const key = decodeURIComponent(slug)
  const [project, siteName] = await Promise.all([
    prisma.project
      .findUnique({ where: { slug: key.toLowerCase() } })
      .then((p) => p ?? prisma.project.findUnique({ where: { id: key } })),
    getSetting<string>('site.title', '个人主页'),
  ])
  if (!project) return new Response('Not found', { status: 404 })

  return renderOgCard({
    siteName: siteName || '个人主页',
    kicker: '作品',
    title: project.name,
    description: project.description,
    chips: parseTags(project.tags).map((t) => `#${t}`),
    meta: [project.role, project.period].filter((v): v is string => Boolean(v)),
  })
}
