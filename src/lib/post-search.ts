import { prisma } from '@/lib/prisma'

/**
 * Full-text search over published posts, using SQLite FTS5 with the trigram tokenizer
 * (substring matching that works for Chinese without a word segmenter).
 *
 * The index lives in an in-memory database owned by this process and is rebuilt from the
 * posts table whenever the posts change (count or newest updatedAt), checked at most every
 * few seconds. Nothing is added to the main database, so Prisma migrations stay untouched,
 * and a lost index costs only one rebuild. Protected posts index their title and excerpt only.
 *
 * Callers fall back to plain `contains` matching when this returns null: queries shorter than
 * three characters (trigram needs three) or a runtime without node:sqlite.
 */

type Statement = {
  run: (...params: unknown[]) => unknown
  all: (...params: unknown[]) => Record<string, unknown>[]
}
type Db = { exec: (sql: string) => void; prepare: (sql: string) => Statement }

const CHECK_INTERVAL_MS = 5_000
const MIN_QUERY_LENGTH = 3

let dbPromise: Promise<Db | null> | null = null
let signature = ''
let checkedAt = 0
let rebuilding: Promise<void> | null = null

async function openDb(): Promise<Db | null> {
  try {
    const moduleName = 'node:sqlite'
    const sqlite = (await import(/* webpackIgnore: true */ moduleName)) as { DatabaseSync?: new (path: string) => Db }
    if (!sqlite.DatabaseSync) return null
    const db = new sqlite.DatabaseSync(':memory:')
    db.exec(`CREATE VIRTUAL TABLE post_fts USING fts5(post_id UNINDEXED, title, excerpt, body, tokenize = 'trigram')`)
    return db
  } catch (error) {
    console.warn('[post-search] 全文索引不可用，回退为普通匹配：', error instanceof Error ? error.message : error)
    return null
  }
}

async function currentSignature() {
  const agg = await prisma.post.aggregate({ _count: { _all: true }, _max: { updatedAt: true } })
  return `${agg._count._all}:${agg._max.updatedAt?.getTime() ?? 0}`
}

async function rebuild(db: Db, nextSignature: string) {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true, excerpt: true, content: true, isProtected: true },
  })
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM post_fts')
    const insert = db.prepare('INSERT INTO post_fts (post_id, title, excerpt, body) VALUES (?, ?, ?, ?)')
    for (const post of posts) {
      insert.run(post.id, post.title, post.excerpt ?? '', post.isProtected ? '' : post.content)
    }
    db.exec('COMMIT')
    signature = nextSignature
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

async function ensureFresh(db: Db) {
  const now = Date.now()
  if (signature && now - checkedAt < CHECK_INTERVAL_MS) return
  checkedAt = now
  const next = await currentSignature()
  if (next === signature) return
  if (!rebuilding) rebuilding = rebuild(db, next).finally(() => (rebuilding = null))
  await rebuilding
}

/** FTS5 phrase query for the user's words: every word must appear, as typed. */
export function toFtsQuery(input: string) {
  const words = input.trim().split(/\s+/).filter((w) => w.length >= MIN_QUERY_LENGTH)
  if (words.length === 0) return null
  return words.map((w) => `"${w.replace(/"/g, '""')}"`).join(' AND ')
}

/** Ids of matching published posts, best match first; null means "use the fallback". */
export async function searchPostIds(input: string, limit = 200): Promise<string[] | null> {
  const query = toFtsQuery(input)
  if (!query) return null
  dbPromise ??= openDb()
  const db = await dbPromise
  if (!db) return null
  try {
    await ensureFresh(db)
    const rows = db
      .prepare('SELECT post_id FROM post_fts WHERE post_fts MATCH ? ORDER BY bm25(post_fts, 0, 10, 4, 1) LIMIT ?')
      .all(query, limit)
    return rows.map((row) => String(row.post_id))
  } catch (error) {
    console.warn('[post-search] 全文检索失败，回退为普通匹配：', error instanceof Error ? error.message : error)
    return null
  }
}
