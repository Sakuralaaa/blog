import { PostStatus } from '@prisma/client'
import { type AiRuntimeSettings, getAiRuntimeSettings } from '@/lib/ai/config'
import { runOpenAiCompatibleEmbeddings } from '@/lib/ai/provider'
import { type IndexablePost, nowIso, sha256, estimateTokenCount, shouldIndexPost, buildPostChecksum, buildPostChunks } from '@/lib/ai/vector-chunks'
import { type OpenVectorDatabaseResult, sanitizeDimension, toStringOrEmpty, toNumberOrZero, clamp, resolveRebuildConcurrency, beginTransaction, commitTransaction, rollbackTransaction, openVectorDatabase, closeQuietly } from '@/lib/ai/vector-db'
import { prisma } from '@/lib/prisma'

export type AiVectorSearchHit = {
  chunkId: string
  postId: string
  chunkIndex: number
  content: string
  distance: number
  score: number
}

export type AiPostIndexResult = {
  postId: string
  status: 'indexed' | 'unchanged' | 'deleted' | 'skipped'
  chunkCount: number
  reason?: string
}

export type AiRebuildIndexResult = {
  totalPublishedPosts: number
  indexed: number
  unchanged: number
  deleted: number
  failed: number
  errors: Array<{
    postId: string
    error: string
  }>
}

export type AiVectorIndexStats = {
  documentTotal: number
  indexedDocuments: number
  failedDocuments: number
  chunkTotal: number
  queuedDocuments: number
  lastIndexedAt: string | null
}

export type AiVectorIndexReadiness = {
  ready: boolean
  reason: string | null
}


function sanitizeScore(distance: number) {
  const safeDistance = Number.isFinite(distance) ? Math.max(distance, 0) : 0
  return 1 / (1 + safeDistance)
}

function normalizeEmbeddingVector(value: unknown) {
  if (!Array.isArray(value)) {
    return null
  }

  const vector = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
  if (vector.length === 0) {
    return null
  }

  return vector
}

function normalizeEmbeddingMatrix(value: unknown, context: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${context} 返回结果不是数组，无法继续检索`)
  }

  const matrix = value
    .map((item) => normalizeEmbeddingVector(item))
    .filter((item): item is number[] => Boolean(item))

  if (matrix.length === 0) {
    throw new Error(`${context} 未返回有效向量，请确认 embedding 模型与接口兼容性`)
  }

  return matrix
}

function assertAiReady(settings: AiRuntimeSettings) {
  if (!settings.enabled) {
    throw new Error('AI 功能未启用')
  }

  if (!settings.hasApiKey) {
    throw new Error('AI API Key 未配置')
  }
}

function isIndexDimensionMismatchError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return message.includes('Embedding 维度与当前索引维度不一致')
}

async function indexPostRecord(
  post: IndexablePost,
  context: {
    settings: AiRuntimeSettings
    dbContext?: OpenVectorDatabaseResult
  }
): Promise<AiPostIndexResult> {
  if (!shouldIndexPost(post)) {
    await deletePostVectorIndex(post.id)
    return {
      postId: post.id,
      status: 'deleted',
      chunkCount: 0,
      reason: '文章不是已发布状态，已移除索引',
    }
  }

  const checksum = sha256(`${buildPostChecksum(post)}:${context.settings.baseUrl}:${context.settings.embeddingModel}:${context.settings.embeddingDimensions}`)
  const probe = context.dbContext || await openVectorDatabase()
  try {
    const existing = probe.db.prepare('SELECT status, content_checksum AS checksum, chunk_count AS count FROM ai_documents WHERE post_id = ?').get(post.id)
    if (existing?.status === 'indexed' && existing.checksum === checksum) {
      return { postId: post.id, status: 'unchanged', chunkCount: toNumberOrZero(existing.count) }
    }
  } finally { if (!context.dbContext) closeQuietly(probe.db) }
  const chunks = buildPostChunks(post)
  const embeddingInputs = chunks.map((item) => item.embeddingInput)

  const vectors: number[][] = []
  for (let start = 0; start < embeddingInputs.length; start += 16) {
    vectors.push(...normalizeEmbeddingMatrix(await runOpenAiCompatibleEmbeddings({
      texts: embeddingInputs.slice(start, start + 16), settings: context.settings,
    }), '索引 embedding'))
  }

  if (vectors.length !== embeddingInputs.length) {
    throw new Error(
      `索引 embedding 数量不匹配：期望 ${embeddingInputs.length}，实际 ${vectors.length}`
    )
  }

  const vectorDimension = sanitizeDimension(
    vectors[0]?.length ?? context.settings.embeddingDimensions,
    context.settings.embeddingDimensions
  )

  if (vectors.some((vector) => vector.length !== vectorDimension)) {
    throw new Error('Embedding 返回向量维度不一致，无法写入索引')
  }

  let dbContext = context.dbContext
  if (!dbContext) {
    dbContext = await openVectorDatabase({
      dimensions: vectorDimension,
      resetOnDimensionMismatch: false,
    })
  } else if (dbContext.dimension !== vectorDimension) {
    throw new Error(
      `Embedding 维度与当前索引维度不一致：索引维度 ${dbContext.dimension}，本次向量维度 ${vectorDimension}`
    )
  }

  const { db } = dbContext

  try {
    const existingDoc = db
      .prepare(
        'SELECT status, content_checksum AS contentChecksum, chunk_count AS chunkCount FROM ai_documents WHERE post_id = ?'
      )
      .get(post.id)

    const existingChecksum = toStringOrEmpty(existingDoc?.contentChecksum)
    const existingStatus = toStringOrEmpty(existingDoc?.status)
    const existingChunkCount = toNumberOrZero(existingDoc?.chunkCount)

    if (existingStatus === 'indexed' && existingChecksum === checksum) {
      return {
        postId: post.id,
        status: 'unchanged',
        chunkCount: existingChunkCount,
      }
    }

    const timestamp = nowIso()

    beginTransaction(db)
    try {
      db
        .prepare('DELETE FROM ai_chunk_vectors WHERE chunk_id IN (SELECT id FROM ai_chunks WHERE post_id = ?)')
        .run(post.id)
      db.prepare('DELETE FROM ai_chunks WHERE post_id = ?').run(post.id)

      db.prepare('INSERT OR IGNORE INTO ai_documents (post_id, status, updated_at, chunk_count) VALUES (?, ?, ?, ?)').run(post.id, 'indexing', timestamp, 0)

      const insertChunkStmt = db.prepare(
        `
        INSERT INTO ai_chunks (id, post_id, chunk_index, content, token_count, checksum, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )

      const insertVectorStmt = db.prepare(
        'INSERT INTO ai_chunk_vectors (chunk_id, embedding) VALUES (?, ?)'
      )

      for (const [index, chunk] of chunks.entries()) {
        const chunkId = `${post.id}:${chunk.chunkIndex}`
        insertChunkStmt.run(
          chunkId,
          post.id,
          chunk.chunkIndex,
          chunk.content,
          estimateTokenCount(chunk.content),
          sha256(chunk.content),
          timestamp
        )

        const vector = vectors[index]
        if (vector) {
          insertVectorStmt.run(chunkId, JSON.stringify(vector))
        }
      }

      db
        .prepare(
          `
          INSERT INTO ai_documents (post_id, status, indexed_at, updated_at, error, content_checksum, chunk_count)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(post_id) DO UPDATE SET
            status = excluded.status,
            indexed_at = excluded.indexed_at,
            updated_at = excluded.updated_at,
            error = excluded.error,
            content_checksum = excluded.content_checksum,
            chunk_count = excluded.chunk_count
          `
        )
        .run(post.id, 'indexed', timestamp, timestamp, null, checksum, chunks.length)

      commitTransaction(db)
    } catch (error) {
      rollbackTransaction(db)

      db
        .prepare(
          `
          INSERT INTO ai_documents (post_id, status, indexed_at, updated_at, error, content_checksum, chunk_count)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(post_id) DO UPDATE SET
            status = excluded.status,
            indexed_at = excluded.indexed_at,
            updated_at = excluded.updated_at,
            error = excluded.error,
            content_checksum = excluded.content_checksum,
            chunk_count = excluded.chunk_count
          `
        )
        .run(
          post.id,
          'failed',
          null,
          timestamp,
          error instanceof Error ? error.message : '索引写入失败',
          checksum,
          0
        )

      throw error
    }

    return {
      postId: post.id,
      status: 'indexed',
      chunkCount: chunks.length,
    }
  } finally {
    if (!context.dbContext) {
      closeQuietly(db)
    }
  }
}

export async function indexPostById(postId: string): Promise<AiPostIndexResult> {
  const normalizedPostId = postId.trim()
  if (!normalizedPostId) {
    throw new Error('postId 不能为空')
  }

  const settings = await getAiRuntimeSettings()
  assertAiReady(settings)

  const post = await prisma.post.findUnique({
    where: { id: normalizedPostId },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      status: true,
    },
  })

  if (!post) {
    await deletePostVectorIndex(normalizedPostId)
    return {
      postId: normalizedPostId,
      status: 'deleted',
      chunkCount: 0,
      reason: '文章不存在，已删除索引',
    }
  }

  return indexPostRecord(post, { settings })
}

export async function deletePostVectorIndex(postId: string) {
  const normalizedPostId = postId.trim()
  if (!normalizedPostId) {
    return { postId: normalizedPostId, deleted: false }
  }

  const { db } = await openVectorDatabase()

  try {
    beginTransaction(db)
    try {
      db
        .prepare('DELETE FROM ai_chunk_vectors WHERE chunk_id IN (SELECT id FROM ai_chunks WHERE post_id = ?)')
        .run(normalizedPostId)
      db.prepare('DELETE FROM ai_chunks WHERE post_id = ?').run(normalizedPostId)
      db.prepare('DELETE FROM ai_documents WHERE post_id = ?').run(normalizedPostId)
      commitTransaction(db)
    } catch (error) {
      rollbackTransaction(db)
      throw error
    }

    return {
      postId: normalizedPostId,
      deleted: true,
    }
  } finally {
    closeQuietly(db)
  }
}

async function deletePostVectorIndexes(postIds: string[]) {
  const normalizedPostIds = Array.from(new Set(postIds.map((item) => item.trim()).filter(Boolean)))
  if (!normalizedPostIds.length) {
    return 0
  }

  const { db } = await openVectorDatabase()

  try {
    beginTransaction(db)
    try {
      const deleteVectorsStmt = db.prepare(
        'DELETE FROM ai_chunk_vectors WHERE chunk_id IN (SELECT id FROM ai_chunks WHERE post_id = ?)'
      )
      const deleteChunksStmt = db.prepare('DELETE FROM ai_chunks WHERE post_id = ?')
      const deleteDocStmt = db.prepare('DELETE FROM ai_documents WHERE post_id = ?')

      for (const postId of normalizedPostIds) {
        deleteVectorsStmt.run(postId)
        deleteChunksStmt.run(postId)
        deleteDocStmt.run(postId)
      }

      commitTransaction(db)
    } catch (error) {
      rollbackTransaction(db)
      throw error
    }

    return normalizedPostIds.length
  } finally {
    closeQuietly(db)
  }
}

export async function rebuildAllPostIndex(): Promise<AiRebuildIndexResult> {
  const settings = await getAiRuntimeSettings()
  assertAiReady(settings)

  const publishedRows = await prisma.post.findMany({
    where: {
      status: PostStatus.PUBLISHED,
    },
    select: {
      id: true,
    },
    orderBy: {
      id: 'asc',
    },
  })
  const publishedPostIds = publishedRows.map((row) => row.id)

  const indexedPostIds = await listIndexedPostIds()
  const publishedIdSet = new Set(publishedPostIds)

  const staleIndexedPostIds = indexedPostIds.filter((indexedPostId) => !publishedIdSet.has(indexedPostId))
  let deleted = await deletePostVectorIndexes(staleIndexedPostIds)

  let indexed = 0
  let unchanged = 0
  let failed = 0
  const errors: Array<{ postId: string; error: string }> = []

  const concurrency = resolveRebuildConcurrency()
  let cursor = 0

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      let dbContext = await openVectorDatabase({
        dimensions: settings.embeddingDimensions,
        resetOnDimensionMismatch: true,
      })

      try {
        while (cursor < publishedPostIds.length) {
          const index = cursor
          cursor += 1
          const postId = publishedPostIds[index]
          if (!postId) {
            continue
          }

          const post = await prisma.post.findUnique({
            where: { id: postId },
            select: {
              id: true,
              title: true,
              excerpt: true,
              content: true,
              status: true,
            },
          })
          if (!post) {
            const deleteResult = await deletePostVectorIndex(postId)
            if (deleteResult.deleted) {
              deleted += 1
            }
            continue
          }

          try {
            let result: AiPostIndexResult
            try {
              result = await indexPostRecord(post, {
                settings,
                dbContext,
              })
            } catch (error) {
              if (!isIndexDimensionMismatchError(error)) {
                throw error
              }

              result = await indexPostRecord(post, {
                settings,
              })
              const nextDbContext = await openVectorDatabase()
              closeQuietly(dbContext.db)
              dbContext = nextDbContext
            }

            if (result.status === 'indexed') {
              indexed += 1
            } else if (result.status === 'unchanged') {
              unchanged += 1
            } else if (result.status === 'deleted') {
              deleted += 1
            }
          } catch (error) {
            failed += 1
            if (errors.length < 80) errors.push({
              postId: post.id,
              error: error instanceof Error ? error.message : '重建索引失败',
            })
          }
        }
      } finally {
        closeQuietly(dbContext.db)
      }
    })
  )

  return {
    totalPublishedPosts: publishedPostIds.length,
    indexed,
    unchanged,
    deleted,
    failed,
    errors,
  }
}

export async function listIndexedPostIds() {
  const { db } = await openVectorDatabase()

  try {
    const rows = db
      .prepare('SELECT post_id AS postId FROM ai_documents')
      .all()

    return rows
      .map((row) => toStringOrEmpty(row.postId).trim())
      .filter(Boolean)
  } finally {
    closeQuietly(db)
  }
}

export async function searchAiChunksByEmbedding(
  embedding: number[],
  options: {
    topK: number
    requireReady?: boolean
  }
): Promise<AiVectorSearchHit[]> {
  const normalizedEmbedding = embedding.filter((value) => Number.isFinite(value))
  if (!normalizedEmbedding.length) {
    return []
  }

  const topK = clamp(Math.round(options.topK || 0), 1, 100)
  const { db } = await openVectorDatabase({
    dimensions: normalizedEmbedding.length,
    resetOnDimensionMismatch: false,
  })

  try {
    if (options.requireReady === true) {
      const indexedRow = db
        .prepare("SELECT COUNT(*) AS count FROM ai_documents WHERE status = 'indexed'")
        .get()
      const chunkRow = db
        .prepare('SELECT COUNT(*) AS count FROM ai_chunks')
        .get()

      if (toNumberOrZero(indexedRow?.count) <= 0 || toNumberOrZero(chunkRow?.count) <= 0) {
        throw new Error('请先执行向量化')
      }
    }

    const rows = db
      .prepare(
        `
        SELECT
          c.id AS chunkId,
          c.post_id AS postId,
          c.chunk_index AS chunkIndex,
          c.content AS content,
          v.distance AS distance
        FROM ai_chunk_vectors v
        JOIN ai_chunks c ON c.id = v.chunk_id
        WHERE v.embedding MATCH ? AND v.k = ?
        ORDER BY v.distance ASC
        `
      )
      .all(JSON.stringify(normalizedEmbedding), topK)

    return rows.map((row) => {
      const distance = toNumberOrZero(row.distance)
      return {
        chunkId: toStringOrEmpty(row.chunkId),
        postId: toStringOrEmpty(row.postId),
        chunkIndex: toNumberOrZero(row.chunkIndex),
        content: toStringOrEmpty(row.content),
        distance,
        score: sanitizeScore(distance),
      }
    })
  } finally {
    closeQuietly(db)
  }
}

export async function searchAiChunksByQuery(
  query: string,
  options: {
    topK: number
  }
): Promise<AiVectorSearchHit[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return []
  }

  const settings = await getAiRuntimeSettings()
  assertAiReady(settings)

  let embedding: number[] | null = null

  try {
    const queryEmbeddingList = normalizeEmbeddingMatrix(
      await runOpenAiCompatibleEmbeddings({
        texts: [normalizedQuery],
        settings,
      }),
      '查询 embedding'
    )
    embedding = queryEmbeddingList[0] ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(
      `查询向量生成失败：${message}。请检查 embedding 模型是否为向量模型，以及 OpenAI 兼容服务是否正确返回 /embeddings。`
    )
  }

  if (!embedding) {
    throw new Error('查询向量为空，请检查 embedding 模型配置')
  }

  return searchAiChunksByEmbedding(embedding, {
    topK: options.topK,
    requireReady: true,
  })
}

export async function getAiVectorIndexStats(): Promise<AiVectorIndexStats> {
  const { db } = await openVectorDatabase()

  try {
    const totalRow = db
      .prepare('SELECT COUNT(*) AS count FROM ai_documents')
      .get()
    const indexedRow = db
      .prepare("SELECT COUNT(*) AS count FROM ai_documents WHERE status = 'indexed'")
      .get()
    const failedRow = db
      .prepare("SELECT COUNT(*) AS count FROM ai_documents WHERE status = 'failed'")
      .get()
    const queuedRow = db
      .prepare("SELECT COUNT(*) AS count FROM ai_documents WHERE status = 'queued'")
      .get()
    const chunkRow = db
      .prepare('SELECT COUNT(*) AS count FROM ai_chunks')
      .get()
    const indexedAtRow = db
      .prepare('SELECT MAX(indexed_at) AS maxIndexedAt FROM ai_documents')
      .get()

    return {
      documentTotal: toNumberOrZero(totalRow?.count),
      indexedDocuments: toNumberOrZero(indexedRow?.count),
      failedDocuments: toNumberOrZero(failedRow?.count),
      queuedDocuments: toNumberOrZero(queuedRow?.count),
      chunkTotal: toNumberOrZero(chunkRow?.count),
      lastIndexedAt: toStringOrEmpty(indexedAtRow?.maxIndexedAt) || null,
    }
  } finally {
    closeQuietly(db)
  }
}

export async function getAiVectorIndexReadiness(): Promise<AiVectorIndexReadiness> {
  const stats = await getAiVectorIndexStats()
  const ready = stats.indexedDocuments > 0 && stats.chunkTotal > 0

  return {
    ready,
    reason: ready ? null : '请先执行向量化',
  }
}

export async function markPostIndexQueued(postId: string) {
  const normalizedPostId = postId.trim()
  if (!normalizedPostId) {
    return
  }

  const { db } = await openVectorDatabase()

  try {
    const timestamp = nowIso()
    db
      .prepare(
        `
        INSERT INTO ai_documents (post_id, status, indexed_at, updated_at, error, content_checksum, chunk_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(post_id) DO UPDATE SET
          status = excluded.status,
          updated_at = excluded.updated_at,
          error = excluded.error
        `
      )
      .run(normalizedPostId, 'queued', null, timestamp, null, null, 0)
  } finally {
    closeQuietly(db)
  }
}
