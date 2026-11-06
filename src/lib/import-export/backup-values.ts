import { PostStatus, Prisma } from '@prisma/client'
import { SERIES_NAME_MAX, SERIES_ORDER_MAX, normalizeSeriesName } from '@/lib/post-series'
import type { BackupImportSummary, Counter } from './backup-types'

/** Defensive readers that turn untrusted backup JSON into typed values. */

export type RecordNode = Record<string, unknown>

export type ExistingSettingSnapshot = {
  id: string
  key: string
  editable: boolean
  secret: boolean
}

export type ExistingPostSnapshot = {
  id: string
  slug: string
  passwordHash: string | null
  publishedAt: Date | null
}

export const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
export const BCRYPT_HASH_PATTERN = /^\$2[aby]\$(0[4-9]|1[0-4])\$[./A-Za-z0-9]{53}$/
export const MAX_WARNINGS = 80

export function createCounter(): Counter {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
  }
}

export function createSummary(): BackupImportSummary {
  return {
    categories: createCounter(),
    tags: createCounter(),
    projects: createCounter(),
    posts: createCounter(),
    settings: createCounter(),
    autoCreatedFromPosts: {
      categories: 0,
      tags: 0,
    },
    warnings: [],
    warningOverflow: 0,
  }
}

export function isRecord(value: unknown): value is RecordNode {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function toBooleanFlag(value: string | null | undefined): boolean {
  if (!value) return false
  return TRUE_VALUES.has(value.toLowerCase())
}

export function projectKeys(project: { url: string; slug: string | null; name: string }): string[] {
  return [
    project.slug ? `slug:${project.slug}` : '',
    project.url ? `url:${project.url}` : '',
    `name:${project.name}`,
  ].filter(Boolean)
}

export function pickString(value: unknown, maxLength = 255): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export function pickLongString(value: unknown, maxLength = 2000000): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export function pickRawString(value: unknown, maxLength = 2000000): string | null {
  if (typeof value !== 'string') return null
  const clipped = value.slice(0, maxLength)
  return clipped.length > 0 ? clipped : null
}

export function pickDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined || value === null) {
    return {}
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return {}
  }
}

export function toStringArray(value: unknown, maxLength = 180): string[] {
  if (!Array.isArray(value)) return []

  const result: string[] = []
  const seen = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string') continue
    const normalized = item.trim().slice(0, maxLength)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

export function normalizePostStatus(value: unknown): PostStatus {
  if (typeof value !== 'string') return PostStatus.DRAFT
  const normalized = value.toUpperCase()
  return normalized in PostStatus
    ? (normalized as PostStatus)
    : PostStatus.DRAFT
}

export function normalizeLocale(value: unknown): string {
  if (typeof value !== 'string') return 'zh'
  const normalized = value.trim().slice(0, 12)
  return normalized || 'zh'
}

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_PATTERN.test(value)
}

export function getDataNode(value: unknown): RecordNode | null {
  if (!isRecord(value)) return null

  if (isRecord(value.data)) {
    return value.data
  }

  return value
}

export function toRecordArray(value: unknown): RecordNode[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is RecordNode => isRecord(item))
}

export function toDisplayNameFromSlug(slug: string): string {
  const normalized = slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized ? normalized.slice(0, 120) : slug.slice(0, 120)
}

export function pushWarning(summary: BackupImportSummary, message: string) {
  if (summary.warnings.length < MAX_WARNINGS) {
    summary.warnings.push(message)
    return
  }
  summary.warningOverflow += 1
}


export function readBackupSeries(item: Record<string, unknown>): { series?: string | null; seriesOrder?: number | null } {
  const out: { series?: string | null; seriesOrder?: number | null } = {}
  if ('series' in item) {
    const name = typeof item.series === 'string' ? normalizeSeriesName(item.series).slice(0, SERIES_NAME_MAX) : ''
    out.series = name || null
  }
  if ('seriesOrder' in item) {
    const order = item.seriesOrder
    out.seriesOrder = typeof order === 'number' && Number.isInteger(order) && order >= 1 && order <= SERIES_ORDER_MAX ? order : null
  }
  return out
}
