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

interface TagPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    page?: string
  }>
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = pageNumber(pageParam)
  const pageSize = 12
  const skip = (page - 1) * pageSize

  // 获取标签信息
  const tag = await prisma.tag.findUnique({
    where: { slug },
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
  })

  if (!tag) {
    notFound()
  }

  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        postTags: {
          some: {
            tagId: tag.id,
          },
        },
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
        status: 'PUBLISHED',
        postTags: {
          some: {
            tagId: tag.id,
          },
        },
      },
    }),
  ])

  const totalPages = Math.ceil(totalPosts / pageSize)

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <Link href="/tags" className="text-link">
            <ArrowLeft size={14} aria-hidden="true" /> 全部标签
          </Link>
        }
        title={`#${tag.name}`}
        description={`共 ${totalPosts} 篇文章${totalPages > 1 ? ` · 第 ${page} / ${totalPages} 页` : ''}`}
      />
      <section className="container page-body">
        {posts.length === 0 ? (
          <div className="card empty-state">
            <p>该标签下暂无文章</p>
            <Link href="/posts" className="btn btn--sm">
              浏览所有文章
            </Link>
          </div>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <JournalCard key={post.id} post={post} hideTagId={tag.id} />
            ))}
          </div>
        )}
        <PageLinks page={page} totalPages={totalPages} pathname={`/tags/${slug}`} />
      </section>
    </div>
  )
}

// 生成元数据
export async function generateMetadata({ params, searchParams }: TagPageProps): Promise<Metadata> {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = pageNumber(pageParam)
  const canonical = page > 1
    ? toCanonicalPath(`/tags/${slug}`, { page: String(page) })
    : toCanonicalPath(`/tags/${slug}`)

  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: {
      name: true,
    },
  })

  if (!tag) {
    return {
      title: '标签未找到',
    }
  }

  return {
    title: `#${tag.name} - 文章标签`,
    description: `浏览标记为 "${tag.name}" 的所有文章`,
    alternates: {
      canonical,
    },
  }
}
