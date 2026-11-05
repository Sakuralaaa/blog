import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { Tag as TagIcon } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'

export const revalidate = 60

export const metadata: Metadata = {
  title: '文章标签',
  description: '浏览所有标签，探索不同主题下的文章内容。',
  alternates: {
    canonical: '/tags',
  },
}

export default async function TagsPage() {
  const [tags, totalPosts] = await Promise.all([
    prisma.tag.findMany({
      include: {
        _count: {
          select: {
            posts: {
              where: {
                post: {
                  status: 'PUBLISHED',
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.post.count({
      where: {
        status: 'PUBLISHED',
      },
    }),
  ])

  // 按文章数量排序标签
  const sortedTags = [...tags].sort((a, b) => b._count.posts - a._count.posts)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Tags"
        title="标签"
        description={`共 ${tags.length} 个标签 · ${totalPosts} 篇文章`}
      />
      <section className="container page-body">
        {tags.length === 0 ? (
          <div className="card empty-state">
            <TagIcon size={24} aria-hidden="true" />
            <p>暂无标签</p>
          </div>
        ) : (
          <div className="tag-cloud">
            {sortedTags.map((tag) => (
              <Link key={tag.id} href={`/tags/${tag.slug}`} className="chip tag-cloud__item">
                #{tag.name}
                <span>{tag._count.posts}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
