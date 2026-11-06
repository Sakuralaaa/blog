import { prisma } from '@/lib/prisma'
import type { BackupPayload } from './backup-types'

/** Builds the downloadable backup of posts, taxonomies, projects and settings. */
export async function exportBackupData(includeSensitive: boolean): Promise<BackupPayload> {
  const [categories, tags, projects, posts, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.tag.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.project.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        slug: true,
        url: true,
        description: true,
        image: true,
        role: true,
        period: true,
        tags: true,
        gallery: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        coverImage: true,
        status: true,
        locale: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        isProtected: true,
        passwordHash: true,
        series: true,
        seriesOrder: true,
        category: {
          select: {
            slug: true,
          },
        },
        postTags: {
          select: {
            tag: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.setting.findMany({
      where: includeSensitive
        ? undefined
        : { editable: true, secret: false },
      orderBy: { key: 'asc' },
      select: {
        key: true,
        value: true,
        group: true,
        editable: true,
        secret: true,
        description: true,
      },
    }),
  ])

  return {
    meta: {
      format: 'lagoon-backup',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      includeSensitive,
    },
    counts: {
      categories: categories.length,
      tags: tags.length,
      projects: projects.length,
      posts: posts.length,
      settings: settings.length,
    },
    data: {
      categories: categories.map((item) => ({
        name: item.name,
        slug: item.slug,
        description: item.description,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      tags: tags.map((item) => ({
        name: item.name,
        slug: item.slug,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      projects: projects.map((item) => ({
        name: item.name,
        slug: item.slug,
        url: item.url,
        description: item.description,
        image: item.image,
        role: item.role,
        period: item.period,
        tags: item.tags,
        gallery: item.gallery,
        content: item.content,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      posts: posts.map((item) => ({
        title: item.title,
        slug: item.slug,
        content: item.content,
        excerpt: item.excerpt,
        coverImage: item.coverImage,
        status: item.status,
        locale: item.locale,
        publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        isProtected: item.isProtected,
        ...(includeSensitive ? { passwordHash: item.passwordHash } : {}),
        categorySlug: item.category?.slug || null,
        tagSlugs: item.postTags.map((pt) => pt.tag.slug),
        series: item.series,
        seriesOrder: item.seriesOrder,
      })),
      settings: settings.map((item) => ({
        key: item.key,
        value: item.value,
        group: item.group,
        editable: item.editable,
        secret: item.secret,
        description: item.description,
      })),
    },
  }
}
