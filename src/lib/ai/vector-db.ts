import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import * as sqliteVec from 'sqlite-vec'
import { AI_DEFAULTS } from '@/lib/ai/config'
import { nowIso } from '@/lib/ai/vector-chunks'

/**
 * The sqlite-vec database behind the AI index: locating the file, loading the extension,
 * and keeping its schema in step with the embedding dimension. Split out of vector-store.ts.
 */

export const VECTOR_META_KEY = 'embedding_dimensions'

export type SqliteRow = Record<string, unknown>

export type SqliteStatement = {
  run: (...params: unknown[]) => unknown
  get: (...params: unknown[]) => SqliteRow | undefined
  all: (...params: unknown[]) => SqliteRow[]
}

export type VectorDatabase = {
  exec: (sql: string) => void
  prepare: (sql: string) => SqliteStatement
  close: () => void
  loadExtension: (file: string, entrypoint?: string | undefined) => void
}

export type DatabaseSyncCtor = new (
  path: string,
  options?: {
    allowExtension?: boolean
  }
) => VectorDatabase

export type OpenVectorDatabaseOptions = {
  dimensions?: number
  resetOnDimensionMismatch?: boolean
}

export type OpenVectorDatabaseResult = {
  db: VectorDatabase
  dimension: number
}

export function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0
}

export function sanitizeDimension(value: number, fallback: number) {
  const rounded = Math.round(value)
  return isPositiveInteger(rounded) ? rounded : fallback
}

export function toStringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function toNumberOrZero(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export const SQLITE_JOURNAL_MODES = ['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL', 'OFF'] as const
export type SqliteJournalMode = (typeof SQLITE_JOURNAL_MODES)[number]

export function resolveRebuildConcurrency() {
  const raw = Number.parseInt(process.env.AI_INDEX_REBUILD_CONCURRENCY || '', 10)
  if (!Number.isFinite(raw)) {
    return 1
  }

  return clamp(raw, 1, 2)
}

export function normalizeDatabaseUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

export function resolveVectorDatabaseUrl() {
  const aiVectorDatabaseUrl = normalizeDatabaseUrl(process.env.AI_VECTOR_DATABASE_URL || '')
  if (aiVectorDatabaseUrl) {
    return aiVectorDatabaseUrl
  }

  return normalizeDatabaseUrl(process.env.DATABASE_URL || '')
}

export function resolveSqliteJournalMode(): SqliteJournalMode {
  const raw = (process.env.SQLITE_JOURNAL_MODE || '').trim().toUpperCase()
  if (!raw) {
    return 'DELETE'
  }

  if ((SQLITE_JOURNAL_MODES as readonly string[]).includes(raw)) {
    return raw as SqliteJournalMode
  }

  console.warn(
    `[ai/vector-store] 无效 SQLITE_JOURNAL_MODE=${process.env.SQLITE_JOURNAL_MODE}，将回退为 DELETE（可选值：${SQLITE_JOURNAL_MODES.join(
      ', '
    )}）`
  )
  return 'DELETE'
}

export function resolveSqliteDatabasePath() {
  const rawUrl = resolveVectorDatabaseUrl()
  if (!rawUrl) {
    return path.resolve(process.cwd(), 'prisma', 'dev.db')
  }

  if (!rawUrl.startsWith('file:')) {
    throw new Error('当前仅支持 SQLite（AI_VECTOR_DATABASE_URL 或 DATABASE_URL 需以 file: 开头）')
  }

  const withoutProtocol = rawUrl.slice('file:'.length)
  const [rawPathPart] = withoutProtocol.split('?')
  const decodedPath = decodeURIComponent(rawPathPart || '').trim()

  if (!decodedPath || decodedPath === ':memory:') {
    throw new Error('向量索引不支持内存数据库')
  }

  if (path.isAbsolute(decodedPath)) {
    return decodedPath
  }

  const rootResolved = path.resolve(/* turbopackIgnore: true */ process.cwd(), decodedPath)
  const prismaResolved = path.resolve(process.cwd(), 'prisma', decodedPath)

  if (existsSync(prismaResolved)) {
    return prismaResolved
  }

  if (existsSync(rootResolved)) {
    return rootResolved
  }

  return prismaResolved
}

export function resolveSqliteVecPackageName() {
  if (process.platform === 'linux') {
    if (process.arch === 'x64') return 'sqlite-vec-linux-x64'
    if (process.arch === 'arm64') return 'sqlite-vec-linux-arm64'
  }

  if (process.platform === 'darwin') {
    if (process.arch === 'x64') return 'sqlite-vec-darwin-x64'
    if (process.arch === 'arm64') return 'sqlite-vec-darwin-arm64'
  }

  if (process.platform === 'win32') {
    if (process.arch === 'x64') return 'sqlite-vec-windows-x64'
  }

  return null
}

export function resolveSqliteVecExtensionSuffix() {
  if (process.platform === 'win32') return 'dll'
  if (process.platform === 'darwin') return 'dylib'
  return 'so'
}

export function resolveLoadExtensionCandidates(extensionPath: string) {
  const normalized = extensionPath.trim()
  if (!normalized) {
    return []
  }

  const suffix = `.${resolveSqliteVecExtensionSuffix()}`
  const withoutSuffix = normalized.endsWith(suffix)
    ? normalized.slice(0, -suffix.length)
    : normalized

  return Array.from(new Set([withoutSuffix, normalized].filter(Boolean)))
}

export function normalizePathCandidate(candidate: unknown) {
  if (typeof candidate !== 'string') {
    return null
  }

  const trimmed = candidate.trim()
  if (!trimmed) {
    return null
  }

  return trimmed
}

export function appendPathCandidate(candidates: unknown[], candidate: unknown) {
  const normalized = normalizePathCandidate(candidate)
  if (normalized) {
    candidates.push(normalized)
  }
}

export function resolveSqliteVecExtensionPathFromPackage() {
  const packageName = resolveSqliteVecPackageName()
  if (!packageName) {
    throw new Error(`当前平台不受 sqlite-vec 支持：${process.platform}-${process.arch}`)
  }

  const extensionFileName = `vec0.${resolveSqliteVecExtensionSuffix()}`
  const cwd = process.cwd()
  const candidates: unknown[] = []

  const envPath = (process.env.SQLITE_VEC_EXTENSION_PATH || '').trim()
  if (envPath) {
    const envResolved = path.isAbsolute(envPath) ? envPath : path.resolve(/* turbopackIgnore: true */ cwd, envPath)
    const suffix = `.${resolveSqliteVecExtensionSuffix()}`
    appendPathCandidate(candidates, envResolved)
    if (!envResolved.endsWith(suffix)) {
      appendPathCandidate(candidates, `${envResolved}${suffix}`)
    }
  }

  appendPathCandidate(candidates, path.join(cwd, 'node_modules', packageName, extensionFileName))

  const pnpmDir = path.join(cwd, 'node_modules', '.pnpm')
  if (existsSync(pnpmDir)) {
    try {
      const entries = readdirSync(pnpmDir)
      for (const entry of entries) {
        if (entry.startsWith(`${packageName}@`) || entry.startsWith('sqlite-vec@')) {
          appendPathCandidate(
            candidates,
            path.join(pnpmDir, entry, 'node_modules', packageName, extensionFileName)
          )
        }
      }
    } catch {
      // ignore
    }
  }

  if (typeof sqliteVec.getLoadablePath === 'function') {
    try {
      const loadablePath = sqliteVec.getLoadablePath()
      appendPathCandidate(candidates, loadablePath)
    } catch {
      // ignore
    }
  }

  const uniqueCandidates = Array.from(new Set(candidates))
    .map((item) => normalizePathCandidate(item))
    .filter((item): item is string => Boolean(item))

  for (const extensionPath of uniqueCandidates) {
    if (existsSync(extensionPath)) {
      return extensionPath
    }
  }

  throw new Error(
    `未找到 ${packageName} 的扩展文件（${extensionFileName}）。已检查路径：\n${uniqueCandidates
      .map((item) => `- ${item}`)
      .join('\n')}`
  )
}

export function tryLoadSqliteExtensionByPath(db: VectorDatabase, extensionPath: string) {
  const loadCandidates = resolveLoadExtensionCandidates(extensionPath)
  const loadErrors: string[] = []

  for (const loadPath of loadCandidates) {
    try {
      db.loadExtension(loadPath)
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loadErrors.push(`路径 ${loadPath} 加载失败: ${message}`)
    }
  }

  return loadErrors
}

export function loadSqliteVecExtension(db: VectorDatabase) {
  const errors: string[] = []
  const packageName = resolveSqliteVecPackageName() || 'sqlite-vec-linux-x64'

  try {
    const extensionPath = resolveSqliteVecExtensionPathFromPackage()
    const loadErrors = tryLoadSqliteExtensionByPath(db, extensionPath)
    if (!loadErrors) {
      return
    }
    errors.push(
      ['按平台包路径加载失败（已定位到扩展文件）。', ...loadErrors.map((item) => `- ${item}`)].join(
        '\n'
      )
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`按平台包路径加载失败: ${message}`)
  }

  if (typeof sqliteVec.getLoadablePath === 'function') {
    try {
      const loadablePath = sqliteVec.getLoadablePath()
      const normalized = normalizePathCandidate(loadablePath)
      if (normalized) {
        const loadErrors = tryLoadSqliteExtensionByPath(db, normalized)
        if (!loadErrors) {
          return
        }
        errors.push(
          ['按 sqlite-vec getLoadablePath 加载失败。', ...loadErrors.map((item) => `- ${item}`)].join(
            '\n'
          )
        )
      } else {
        errors.push(`按 sqlite-vec getLoadablePath 加载失败: 返回了无效路径类型（${typeof loadablePath}）`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`按 sqlite-vec getLoadablePath 加载失败: ${message}`)
    }
  }

  throw new Error(
    [
      'sqlite-vec 扩展加载失败。',
      `平台: ${process.platform}-${process.arch}`,
      ...errors.map((item) => `- ${item}`),
      `建议执行：pnpm add sqlite-vec ${packageName}`,
    ].join('\n')
  )
}

export async function loadDatabaseSyncCtor() {
  const moduleName = 'node:sqlite'
  const sqliteModule = (await import(moduleName)) as {
    DatabaseSync?: DatabaseSyncCtor
  }

  if (!sqliteModule.DatabaseSync) {
    throw new Error('当前 Node 运行时不支持 node:sqlite')
  }

  return sqliteModule.DatabaseSync
}

export function beginTransaction(db: VectorDatabase) {
  db.exec('BEGIN IMMEDIATE')
}

export function commitTransaction(db: VectorDatabase) {
  db.exec('COMMIT')
}

export function rollbackTransaction(db: VectorDatabase) {
  db.exec('ROLLBACK')
}

export function ensureBaseTables(db: VectorDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_documents (
      post_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      indexed_at TEXT,
      updated_at TEXT NOT NULL,
      error TEXT,
      content_checksum TEXT,
      chunk_count INTEGER NOT NULL DEFAULT 0
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_chunks (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER NOT NULL DEFAULT 0,
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES ai_documents(post_id) ON DELETE CASCADE
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_ai_chunks_post_id ON ai_chunks(post_id)')
}

export function readCurrentDimension(db: VectorDatabase) {
  const row = db
    .prepare('SELECT value FROM ai_meta WHERE key = ?')
    .get(VECTOR_META_KEY)

  if (!row) {
    return null
  }

  const parsed = Number.parseInt(toStringOrEmpty(row.value), 10)
  return isPositiveInteger(parsed) ? parsed : null
}

export function saveCurrentDimension(db: VectorDatabase, dimension: number) {
  db
    .prepare(
      `
      INSERT INTO ai_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `
    )
    .run(VECTOR_META_KEY, String(dimension), nowIso())
}

export function createVectorTable(db: VectorDatabase, dimension: number) {
  const safeDimension = sanitizeDimension(dimension, AI_DEFAULTS.embeddingDimensions)
  db.exec(
    `CREATE VIRTUAL TABLE IF NOT EXISTS ai_chunk_vectors USING vec0(chunk_id TEXT PRIMARY KEY, embedding float[${safeDimension}]);`
  )
}

export function resetVectorIndex(db: VectorDatabase, dimension: number) {
  beginTransaction(db)
  try {
    db.exec('DROP TABLE IF EXISTS ai_chunk_vectors')
    db.exec('DELETE FROM ai_chunks')
    db.exec('DELETE FROM ai_documents')
    saveCurrentDimension(db, dimension)
    createVectorTable(db, dimension)
    commitTransaction(db)
  } catch (error) {
    rollbackTransaction(db)
    throw error
  }
}

export function ensureVectorSchema(db: VectorDatabase, options: OpenVectorDatabaseOptions): number {
  ensureBaseTables(db)

  const currentDimension = readCurrentDimension(db)
  const expectedDimension = options.dimensions
    ? sanitizeDimension(options.dimensions, AI_DEFAULTS.embeddingDimensions)
    : null

  if (expectedDimension !== null) {
    if (currentDimension === null) {
      saveCurrentDimension(db, expectedDimension)
      createVectorTable(db, expectedDimension)
      return expectedDimension
    }

    if (currentDimension !== expectedDimension) {
      if (!options.resetOnDimensionMismatch && Number(db.prepare('SELECT COUNT(*) AS n FROM ai_chunks').get()?.n || 0) > 0) {
        throw new Error(
          `向量维度不一致：当前索引维度 ${currentDimension}，请求维度 ${expectedDimension}，请先重建索引。`
        )
      }

      resetVectorIndex(db, expectedDimension)
      return expectedDimension
    }

    createVectorTable(db, expectedDimension)
    return expectedDimension
  }

  if (currentDimension === null) {
    const fallbackDimension = AI_DEFAULTS.embeddingDimensions
    saveCurrentDimension(db, fallbackDimension)
    createVectorTable(db, fallbackDimension)
    return fallbackDimension
  }

  createVectorTable(db, currentDimension)
  return currentDimension
}

export async function openVectorDatabase(options: OpenVectorDatabaseOptions = {}): Promise<OpenVectorDatabaseResult> {
  const DatabaseSync = await loadDatabaseSyncCtor()
  const dbPath = resolveSqliteDatabasePath()
  const dbDir = path.dirname(dbPath)

  mkdirSync(dbDir, { recursive: true })

  const db = new DatabaseSync(dbPath, { allowExtension: true })
  try {
    loadSqliteVecExtension(db)

    // 稳定性优先：默认使用 DELETE，避免在存储抖动时 WAL 增加额外风险。
    // 可通过 SQLITE_JOURNAL_MODE 显式覆盖。
    const journalMode = resolveSqliteJournalMode()
    try {
      db.exec(`PRAGMA journal_mode = ${journalMode}`)
    } catch {
      // noop
    }

    try {
      db.exec('PRAGMA synchronous = NORMAL')
    } catch {
      // noop
    }

    db.exec('PRAGMA foreign_keys = ON')
    db.exec('PRAGMA busy_timeout = 250')
    db.exec('PRAGMA cache_size = -2048')

    const dimension = ensureVectorSchema(db, options)

    return {
      db,
      dimension,
    }
  } catch (error) {
    closeQuietly(db)
    throw error
  }
}

export function closeQuietly(db: VectorDatabase) {
  try {
    db.close()
  } catch {
    // noop
  }
}
