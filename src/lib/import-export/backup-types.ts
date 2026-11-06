import type { PostStatus } from '@prisma/client'

/** Shapes of a backup file and of an import's summary. */

export type Counter = {
  created: number
  updated: number
  skipped: number
}

export type BackupPayload = {
  meta: {
    format: 'lagoon-backup'
    version: '1.0.0'
    exportedAt: string
    includeSensitive: boolean
  }
  counts: {
    categories: number
    tags: number
    projects: number
    posts: number
    settings: number
  }
  data: {
    categories: Array<{
      name: string
      slug: string
      description: string | null
      createdAt: string
      updatedAt: string
    }>
    tags: Array<{
      name: string
      slug: string
      createdAt: string
      updatedAt: string
    }>
    projects: Array<{
      name: string
      slug: string | null
      url: string
      description: string | null
      image: string | null
      role: string | null
      period: string | null
      tags: string | null
      gallery: string | null
      content: string | null
      createdAt: string
      updatedAt: string
    }>
    posts: Array<{
      title: string
      slug: string
      content: string
      excerpt: string | null
      coverImage: string | null
      status: PostStatus
      locale: string
      publishedAt: string | null
      createdAt: string
      updatedAt: string
      isProtected: boolean
      passwordHash?: string | null
      categorySlug: string | null
      tagSlugs: string[]
      series?: string | null
      seriesOrder?: number | null
    }>
    settings: Array<{
      key: string
      value: unknown
      group: string
      editable: boolean
      secret: boolean
      description: string | null
    }>
  }
}

export type BackupImportSummary = {
  categories: Counter
  tags: Counter
  projects: Counter
  posts: Counter
  settings: Counter
  autoCreatedFromPosts: {
    categories: number
    tags: number
  }
  warnings: string[]
  warningOverflow: number
}
