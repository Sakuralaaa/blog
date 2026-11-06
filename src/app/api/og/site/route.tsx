import { getSetting } from '@/lib/settings'
import { renderOgCard } from '@/lib/og-card'

export const runtime = 'nodejs'

export async function GET() {
  const [siteName, description] = await Promise.all([
    getSetting<string>('site.title', '个人主页'),
    getSetting<string>('site.description', '作品、项目与文章'),
  ])
  const name = siteName || '个人主页'
  return renderOgCard({
    siteName: name,
    title: name,
    description: description || '作品、项目与文章',
    meta: [],
  })
}
