import { JournalCard } from '@/components/posts/journal-card'
import { PageHeader } from '@/components/layout/page-header'
import { PageLinks } from '@/components/posts/page-links'
import { pageNumber, pageSize as boundedPageSize } from '@/lib/pagination'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PostFilters } from '@/components/posts/post-filters'
import { getSetting } from '@/lib/settings'
import { Suspense } from 'react'
import { toCanonicalPath } from '@/lib/seo'

export const revalidate = 60

interface PostsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    category?: string
    tag?: string
  }>
}

export async function generateMetadata({ searchParams }: PostsPageProps): Promise<Metadata> {
  const params = await searchParams
  const page = pageNumber(params.page)
  const search = params.search?.trim() || ''
  const category = params.category?.trim() || ''
  const tag = params.tag?.trim() || ''

  const canonical = toCanonicalPath('/posts', {
    ...(page > 1 ? { page: String(page) } : {}),
    ...(category ? { category } : {}),
    ...(tag ? { tag } : {}),
  })

  const hasNonPaginationFilter = Boolean(search || category || tag)
  return {
    title: '文章列表',
    description: '浏览所有已发布的文章。',
    alternates: {
      canonical,
    },
    robots: hasNonPaginationFilter
      ? {
          index: false,
          follow: true,
        }
      : undefined,
  }
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams
  const page = pageNumber(params.page)
  const pageSize = boundedPageSize(await getSetting<number>('posts.perPage', 12), 12)
  const skip = (page - 1) * pageSize

  // 获取筛选参数
  const search = params.search || ''
  const categorySlug = params.category || ''
  const tagSlug = params.tag || ''

  // 构建查询条件
  const where: Prisma.PostWhereInput = {
    status: 'PUBLISHED',
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
      { AND: [{ isProtected: false }, { content: { contains: search } }] },
    ]
  }

  if (categorySlug) {
    where.category = {
      slug: categorySlug,
    }
  }

  if (tagSlug) {
    where.postTags = {
      some: {
        tag: {
          slug: tagSlug,
        },
      },
    }
  }

  const [totalPosts, posts, categories, tags] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
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
        posts: {
          _count: 'desc',
        },
      },
      take: 20,
    }),
  ])

  const totalPages = Math.ceil(totalPosts / pageSize)
  const filtered = Boolean(search || categorySlug || tagSlug)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Writing"
        title="文章"
        description={`共 ${totalPosts} 篇${filtered ? '符合条件的' : ''}文章${
          totalPages > 1 ? ` · 第 ${page} / ${totalPages} 页` : ''
        }`}
      />
      <section className="container page-body">
        <div className="filter-bar">
          <Suspense fallback={<div className="filter-bar__skeleton" />}>
            <PostFilters key={JSON.stringify(params)} categories={categories} tags={tags} />
          </Suspense>
        </div>
        {posts.length === 0 ? (
          <div className="card empty-state">
            <p>没有找到相关文章</p>
            <Link href="/posts" className="btn btn--sm">
              清除筛选条件
            </Link>
          </div>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
        )}
        <PageLinks
          page={page}
          totalPages={totalPages}
          pathname="/posts"
          query={{ search: params.search, category: params.category, tag: params.tag }}
        />
      </section>
    </div>
  )
}
