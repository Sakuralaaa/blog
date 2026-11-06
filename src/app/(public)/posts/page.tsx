import { JournalCard } from '@/components/posts/journal-card'
import { PageHeader } from '@/components/layout/page-header'
import { PageLinks } from '@/components/posts/page-links'
import { pageNumber, pageSize as boundedPageSize } from '@/lib/pagination'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PostFilters } from '@/components/posts/post-filters'
import { getSetting } from '@/lib/settings'
import { Suspense } from 'react'
import { toCanonicalPath } from '@/lib/seo'
import { normalizeSeriesName, SERIES_NAME_MAX } from '@/lib/post-series'
import { getSeriesSummaries } from '@/lib/series-groups'
import { SeriesCard } from '@/components/posts/series-card'

export const revalidate = 60

interface PostsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    category?: string
    tag?: string
    series?: string
  }>
}

function readSeries(value: string | undefined) {
  const name = normalizeSeriesName(value || '')
  return name.length > 0 && name.length <= SERIES_NAME_MAX ? name : ''
}

export async function generateMetadata({ searchParams }: PostsPageProps): Promise<Metadata> {
  const params = await searchParams
  const page = pageNumber(params.page)
  const search = params.search?.trim() || ''
  const category = params.category?.trim() || ''
  const tag = params.tag?.trim() || ''
  const series = readSeries(params.series)

  if (series) {
    return {
      title: `系列：${series}`,
      description: `「${series}」系列的全部文章，按顺序阅读。`,
      alternates: { canonical: toCanonicalPath('/posts', { series }) },
    }
  }

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

const postCardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  publishedAt: true,
  readingTime: true,
  isProtected: true,
  series: true,
  seriesOrder: true,
  author: { select: { name: true, image: true } },
  category: { select: { name: true, slug: true } },
  postTags: {
    take: 5,
    select: { tag: { select: { id: true, name: true, slug: true } } },
  },
  viewCount: { select: { count: true } },
} satisfies Prisma.PostSelect

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams
  const series = readSeries(params.series)
  if (series) return <SeriesView series={series} />

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

  // Without a search or tag filter, a series shows as one card instead of every part.
  const collapseSeries = !search && !tagSlug
  const listWhere: Prisma.PostWhereInput = collapseSeries ? { ...where, series: null } : where

  const [totalPosts, listTotal, allPublished, posts, categories, tags, seriesList] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.count({ where: listWhere }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.post.findMany({
      where: listWhere,
      select: postCardSelect,
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
    collapseSeries && page === 1
      ? getSeriesSummaries(categorySlug ? { category: { slug: categorySlug } } : {})
      : Promise.resolve([]),
  ])

  const totalPages = Math.ceil(listTotal / pageSize)
  const filtered = Boolean(search || categorySlug || tagSlug)
  const activeCategory = categories.find((c) => c.slug === categorySlug)
  // Tabs: categories that have posts, most posts first (the current one stays visible).
  const tabs = categories
    .filter((c) => c._count.posts > 0 || c.slug === categorySlug)
    .sort((a, b) => b._count.posts - a._count.posts || a.name.localeCompare(b.name, 'zh'))
  const tabHref = (slug: string | null) => {
    const q = new URLSearchParams()
    if (slug) q.set('category', slug)
    if (params.tag) q.set('tag', params.tag)
    if (params.search) q.set('search', params.search)
    const qs = q.toString()
    return qs ? `/posts?${qs}` : '/posts'
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Writing"
        title={activeCategory ? activeCategory.name : '文章'}
        description={`${activeCategory?.description ? `${activeCategory.description} · ` : ''}共 ${totalPosts} 篇${
          filtered ? '符合条件的' : ''
        }文章${totalPages > 1 ? ` · 第 ${page} / ${totalPages} 页` : ''}`}
      />
      <section className="container page-body">
        {tabs.length > 1 && (
          <nav className="category-tabs" aria-label="文章分类">
            <Link href={tabHref(null)} aria-current={!categorySlug ? 'page' : undefined}>
              全部 <small>{allPublished}</small>
            </Link>
            {tabs.map((cat) => (
              <Link
                key={cat.slug}
                href={tabHref(cat.slug)}
                aria-current={cat.slug === categorySlug ? 'page' : undefined}
              >
                {cat.name} <small>{cat._count.posts}</small>
              </Link>
            ))}
          </nav>
        )}
        <div className="filter-bar">
          <Suspense fallback={<div className="filter-bar__skeleton" />}>
            <PostFilters key={JSON.stringify(params)} categories={categories} tags={tags} />
          </Suspense>
        </div>
        {seriesList.length > 0 && (
          <section className="series-section" aria-labelledby="posts-series">
            <h2 id="posts-series" className="series-section__title">专题</h2>
            <div className="post-grid">
              {seriesList.map((item) => (
                <SeriesCard key={item.name} series={item} />
              ))}
            </div>
          </section>
        )}
        {posts.length === 0 && seriesList.length === 0 ? (
          <div className="card empty-state">
            <p>没有找到相关文章</p>
            <Link href="/posts" className="btn btn--sm">
              清除筛选条件
            </Link>
          </div>
        ) : posts.length === 0 ? null : (
          <>
            {seriesList.length > 0 && <h2 className="series-section__title">文章</h2>}
            <div className="post-grid">
              {posts.map((post) => (
                <JournalCard key={post.id} post={post} />
              ))}
            </div>
          </>
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

/** One series, in reading order. */
async function SeriesView({ series }: { series: string }) {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', series },
    select: postCardSelect,
    orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'asc' }, { id: 'asc' }],
    take: 200,
  })
  // SQLite sorts NULL first; put unnumbered parts after the numbered ones.
  const ordered = [...posts.filter((p) => p.seriesOrder != null), ...posts.filter((p) => p.seriesOrder == null)]

  return (
    <div className="page">
      <PageHeader
        eyebrow="Series"
        title={series}
        description={ordered.length > 0 ? `共 ${ordered.length} 篇 · 按顺序阅读` : '这个系列还没有已发布的文章'}
      />
      <section className="container page-body">
        <Link href="/posts" className="text-link series-head__back">
          <ArrowLeft size={14} aria-hidden="true" /> 全部文章
        </Link>
        {ordered.length === 0 ? (
          <div className="card empty-state">
            <p>没有找到这个系列</p>
          </div>
        ) : (
          <div className="post-grid">
            {ordered.map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
