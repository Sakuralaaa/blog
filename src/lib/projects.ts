import { isValidSlug } from './slug'
import { isSafeImageSrc } from './utils'

/** Fields an admin can set on a work, as the API accepts them. */
export type ProjectInput = {
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
}

export class ProjectInputError extends Error {}

const LIMITS = {
  name: 200,
  slug: 120,
  url: 1200,
  description: 4000,
  image: 2000,
  role: 200,
  period: 200,
  tags: 1000,
  gallery: 40000,
  content: 400000,
} as const

type Field = keyof typeof LIMITS

function text(body: Record<string, unknown>, field: Field, multiline = false): string | null | undefined {
  const raw = body[field]
  if (raw === undefined) return undefined
  if (raw === null) return null
  if (typeof raw !== 'string') throw new ProjectInputError(`${field} 必须是字符串`)
  const value = multiline ? raw.replace(/\r\n?/g, '\n').trim() : raw.trim()
  if (value.length > LIMITS[field]) throw new ProjectInputError(`${field} 太长（最多 ${LIMITS[field]} 字）`)
  return value || null
}

/**
 * Validates a create (partial = false) or update (partial = true) body.
 * Fields left out of an update stay as they are; an empty string clears one.
 */
export function parseProjectInput(body: Record<string, unknown>, partial: boolean): Partial<ProjectInput> {
  const out: Partial<ProjectInput> = {}

  const name = text(body, 'name')
  if (name !== undefined || !partial) {
    if (!name) throw new ProjectInputError('作品名称不能为空')
    out.name = name
  }

  const slug = text(body, 'slug')
  if (slug !== undefined) {
    if (slug && (!isValidSlug(slug) || /^c[a-z0-9]{20,}$/.test(slug))) {
      throw new ProjectInputError('访问路径只能包含字母、数字、中文、- 和 _')
    }
    out.slug = slug ? slug.toLowerCase() : null
  }

  const url = text(body, 'url')
  if (url !== undefined) {
    if (url && !/^(https?:\/\/|\/(?!\/))\S+$/i.test(url)) {
      throw new ProjectInputError('访问链接需以 http(s):// 或 / 开头')
    }
    out.url = url || ''
  } else if (!partial) {
    out.url = ''
  }

  for (const field of ['description', 'image', 'role', 'period', 'tags'] as const) {
    const value = text(body, field)
    if (value !== undefined) out[field] = value
  }
  for (const field of ['gallery', 'content'] as const) {
    const value = text(body, field, true)
    if (value !== undefined) out[field] = value
  }
  if (out.image && !isSafeImageSrc(out.image)) throw new ProjectInputError('封面图地址无效')
  if (out.gallery) {
    const images = parseGallery(out.gallery)
    out.gallery = images.length ? images.join('\n') : null
  }
  if (out.tags) {
    const tags = parseTags(out.tags)
    out.tags = tags.length ? tags.join(', ') : null
  }
  return out
}

export function parseTags(value: string | null | undefined): string[] {
  if (!value) return []
  const seen = new Set<string>()
  for (const raw of value.split(/[,，、\n]/)) {
    const tag = raw.trim()
    if (tag && !seen.has(tag)) seen.add(tag)
  }
  return Array.from(seen).slice(0, 20)
}

export function parseGallery(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(/\s*\n\s*/)
    .map((line) => line.trim())
    .filter((line) => isSafeImageSrc(line))
    .slice(0, 60)
}

/** The detail page path of a work: its slug when it has one, else its id. */
export function projectPath(project: { id: string; slug?: string | null }) {
  return `/projects/${encodeURIComponent(project.slug || project.id)}`
}
