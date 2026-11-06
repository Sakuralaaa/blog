import { pageNumber } from '@/lib/pagination'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toCanonicalPath } from '@/lib/seo'
import { PageHeader } from '@/components/layout/page-header'
import { PageLinks } from '@/components/posts/page-links'
import { JournalCard } from '@/components/posts/journal-card'

// 动态渲染：避免 Docker 构建时用空模板库预渲染的页面在重启后被当作旧缓存返回
export const dynamic = 'force-dynamic'

interface CategoryPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    page?: string
  }>
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = pageNumber(pageParam)
  const pageSize = 12
  const skip = (page - 1) * pageSize

  // 获取分类信息
  const category = await prisma.category.findUnique({
    where: { slug },
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
  })

  if (!category) {
    notFound()
  }

  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        categoryId: category.id,
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
        author: {
          select: {
            name: true,
            image: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        postTags: {
          take: 5,
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        viewCount: {
          select: {
            count: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      skip,
      take: pageSize,
    }),
    prisma.post.count({
      where: {
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    }),
  ])

  const totalPages = Math.ceil(totalPosts / pageSize)

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <Link href="/categories" className="text-link">
            <ArrowLeft size={14} aria-hidden="true" /> 全部分类
          </Link>
        }
        title={category.name}
        description={`${category.description ? `${category.description} · ` : ''}共 ${totalPosts} 篇文章${
          totalPages > 1 ? ` · 第 ${page} / ${totalPages} 页` : ''
        }`}
      />
      <section className="container page-body">
        {posts.length === 0 ? (
          <div className="card empty-state">
            <p>该分类下暂无文章</p>
            <Link href="/posts" className="btn btn--sm">
              浏览所有文章
            </Link>
          </div>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
        )}
        <PageLinks page={page} totalPages={totalPages} pathname={`/categories/${slug}`} />
      </section>
    </div>
  )
}

// 生成元数据
export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = pageNumber(pageParam)
  const canonical = page > 1
    ? toCanonicalPath(`/categories/${slug}`, { page: String(page) })
    : toCanonicalPath(`/categories/${slug}`)

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
    },
  })

  if (!category) {
    return {
      title: '分类未找到',
    }
  }

  return {
    title: `${category.name} - 文章分类`,
    description: category.description || `浏览 ${category.name} 分类的所有文章`,
    alternates: {
      canonical,
    },
  }
}
