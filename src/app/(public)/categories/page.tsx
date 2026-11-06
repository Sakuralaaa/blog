import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'

// 动态渲染：避免 Docker 构建时用空模板库预渲染的页面在重启后被当作旧缓存返回
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '文章分类',
  description: '浏览所有文章分类，快速定位你感兴趣的主题。',
  alternates: {
    canonical: '/categories',
  },
}

export default async function CategoriesPage() {
  const [categories, totalPosts] = await Promise.all([
    prisma.category.findMany({
      include: {
        _count: {
          select: {
            posts: {
              where: {
                status: 'PUBLISHED',
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

  return (
    <div className="page">
      <PageHeader
        eyebrow="Categories"
        title="分类"
        description={`共 ${categories.length} 个分类 · ${totalPosts} 篇文章`}
      />
      <section className="container page-body">
        {categories.length === 0 ? (
          <div className="card empty-state">
            <FolderOpen size={24} aria-hidden="true" />
            <p>暂无分类</p>
          </div>
        ) : (
          <div className="cat-grid">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="card card--hover cat-card"
              >
                <span className="cat-card__name">{category.name}</span>
                {category.description && (
                  <span className="cat-card__desc">{category.description}</span>
                )}
                <span className="cat-card__count">{category._count.posts} 篇</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
