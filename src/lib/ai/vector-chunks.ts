import crypto from 'node:crypto'
import { PostStatus } from '@prisma/client'

/** Splitting posts into embedding chunks for the AI index. Split out of vector-store.ts. */

const MAX_CHUNK_CHARS = 1200
const CHUNK_OVERLAP_CHARS = 160

export type IndexablePost = {
  id: string
  title: string
  content: string
  excerpt: string | null
  status: PostStatus
}

export type BuiltChunk = {
  chunkIndex: number
  content: string
  embeddingInput: string
}

export function nowIso() {
  return new Date().toISOString()
}

export function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function estimateTokenCount(text: string) {
  const normalized = text.trim()
  if (!normalized) return 0

  const byWhitespace = normalized.split(/\s+/).filter(Boolean).length
  const byChars = Math.ceil(normalized.length / 4)

  return Math.max(byWhitespace, byChars)
}

export function splitLongParagraph(paragraph: string) {
  if (paragraph.length <= MAX_CHUNK_CHARS) {
    return [paragraph]
  }

  const chunks: string[] = []
  let start = 0

  while (start < paragraph.length) {
    const end = Math.min(paragraph.length, start + MAX_CHUNK_CHARS)
    const piece = paragraph.slice(start, end).trim()
    if (piece) {
      chunks.push(piece)
    }

    if (end >= paragraph.length) {
      break
    }

    const nextStart = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1)
    start = nextStart
  }

  return chunks
}

export function splitPostContent(content: string) {
  const normalized = content.replace(/\r\n?/g, '\n').trim()
  if (!normalized) {
    return []
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

  const normalizedParagraphs = paragraphs.flatMap((paragraph) => splitLongParagraph(paragraph))
  const chunks: string[] = []

  let current = ''
  for (const paragraph of normalizedParagraphs) {
    if (!current) {
      current = paragraph
      continue
    }

    const next = `${current}\n\n${paragraph}`
    if (next.length <= MAX_CHUNK_CHARS) {
      current = next
      continue
    }

    chunks.push(current)
    current = paragraph
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

export function shouldIndexPost(post: Pick<IndexablePost, 'status'>) {
  return post.status === PostStatus.PUBLISHED
}

export function buildPostChecksum(post: Pick<IndexablePost, 'title' | 'excerpt' | 'content'>) {
  const joined = [post.title.trim(), (post.excerpt || '').trim(), post.content.trim()].join('\n\n')
  return sha256(joined)
}

export function buildEmbeddingInput(post: Pick<IndexablePost, 'title' | 'excerpt'>, chunk: string) {
  return [
    `标题：${post.title}`,
    post.excerpt ? `摘要：${post.excerpt}` : '',
    `正文片段：${chunk}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildPostChunks(post: Pick<IndexablePost, 'title' | 'excerpt' | 'content'>): BuiltChunk[] {
  const rawChunks = splitPostContent(post.content)

  return rawChunks.map((content, index) => ({
    chunkIndex: index,
    content,
    embeddingInput: buildEmbeddingInput(post, content),
  }))
}
