import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'
import { ArchiveTimeline } from '@/components/posts/archive-timeline'
import { getArchiveTimeline } from '@/lib/archive'
import { PageHeader } from '@/components/layout/page-header'

export const revalidate = 60

export const metadata: Metadata = {
  title: '文章归档',
  description: '按时间轴回顾全部文章，快速定位历史内容。',
  alternates: {
    canonical: '/archive',
  },
}

export default async function ArchivePage() {
  const { years, totalPosts } = await getArchiveTimeline()

  return (
    <div className="page">
      <PageHeader
        eyebrow="Archive"
        title="归档"
        description={`共 ${totalPosts} 篇文章 · 覆盖 ${years.length} 个年份`}
      />
      <section className="container page-body">
        {totalPosts === 0 ? (
          <div className="card empty-state">
            <CalendarDays size={24} aria-hidden="true" />
            <p>暂无可归档文章</p>
          </div>
        ) : (
          <ArchiveTimeline years={years} />
        )}
      </section>
    </div>
  )
}
