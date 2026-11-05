import { NextResponse } from 'next/server'
import { extractApiKey, requireApiKey } from '@/lib/api-keys'
import { readJsonBody, RequestBodyError, bodyErrorResponse } from '@/lib/request-body'

// Model Context Protocol endpoint (Streamable HTTP, stateless, JSON responses).
// Agents such as Claude Code and Codex connect with the blog URL + an API key created
// under 后台 → API Key. Every tool forwards to the existing /api/plugin/* routes, so the
// key's permissions, rate limits and validation all apply unchanged.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const SERVER_INFO = { name: 'papergrid', version: '1.0.0' }
const INSTRUCTIONS = `PaperGrid 博客。文章正文是 Markdown / MDX。
- 新文章默认存为草稿（status=DRAFT），确认后再用 update_post 设 status=PUBLISHED 发布。
- tags 传标签 ID 数组；先用 list_tags 查，没有就 create_tag。分类同理（list_categories / create_category）。
- 图片先用 upload_image 上传，再把返回的 url 写进正文或 coverImage。
- 「雅集」作品页用 list_projects / create_project / update_project / delete_project 管理。`

type Json = Record<string, unknown>
type Tool = {
  name: string
  description: string
  inputSchema: Json
  run: (args: Json, call: Caller) => Promise<unknown>
}
type Caller = (method: string, path: string, body?: unknown) => Promise<unknown>

const str = { type: 'string' }
const postFields = {
  title: { ...str, description: '标题' },
  content: { ...str, description: 'Markdown / MDX 正文' },
  excerpt: { ...str, description: '摘要' },
  coverImage: { ...str, description: '封面图 URL' },
  status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
  categoryId: { ...str, description: '分类 ID' },
  tags: { type: 'array', items: str, description: '标签 ID 数组' },
  locale: { type: 'string', enum: ['zh', 'en'] },
}
const obj = (properties: Json, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false })
const pick = (args: Json, keys: string[]) => Object.fromEntries(keys.filter((k) => args[k] !== undefined).map((k) => [k, args[k]]))
const enc = encodeURIComponent

const TOOLS: Tool[] = [
  {
    name: 'list_posts',
    description: '列出文章（含草稿），可按状态、关键词筛选，分页。',
    inputSchema: obj({
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 50 },
      status: { type: 'string', enum: ['all', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] },
      search: str,
      categoryId: str,
    }),
    run: (a, call) => {
      const q = new URLSearchParams()
      for (const k of ['page', 'limit', 'status', 'search', 'categoryId']) if (a[k] !== undefined) q.set(k, String(a[k]))
      return call('GET', `/api/plugin/posts?${q}`)
    },
  },
  {
    name: 'get_post',
    description: '读取一篇文章的完整内容。',
    inputSchema: obj({ id: str }, ['id']),
    run: (a, call) => call('GET', `/api/plugin/posts/${enc(String(a.id))}`),
  },
  {
    name: 'create_post',
    description: '新建文章，默认存为草稿。',
    inputSchema: obj(postFields, ['title', 'content']),
    run: (a, call) => call('POST', '/api/plugin/posts', pick(a, Object.keys(postFields))),
  },
  {
    name: 'update_post',
    description: '修改文章的任意字段；把 status 设为 PUBLISHED 即发布。',
    inputSchema: obj({ id: str, ...postFields }, ['id']),
    run: (a, call) => call('PATCH', `/api/plugin/posts/${enc(String(a.id))}`, pick(a, Object.keys(postFields))),
  },
  {
    name: 'delete_post',
    description: '删除文章（不可恢复，调用前先和用户确认）。',
    inputSchema: obj({ id: str }, ['id']),
    run: (a, call) => call('DELETE', `/api/plugin/posts/${enc(String(a.id))}`),
  },
  {
    name: 'list_categories',
    description: '列出所有分类。',
    inputSchema: obj({}),
    run: (_a, call) => call('GET', '/api/plugin/categories'),
  },
  {
    name: 'create_category',
    description: '新建分类。',
    inputSchema: obj({ name: str, slug: str, description: str }, ['name']),
    run: (a, call) => call('POST', '/api/plugin/categories', pick(a, ['name', 'slug', 'description'])),
  },
  {
    name: 'list_tags',
    description: '列出所有标签。',
    inputSchema: obj({}),
    run: (_a, call) => call('GET', '/api/plugin/tags'),
  },
  {
    name: 'create_tag',
    description: '新建标签。',
    inputSchema: obj({ name: str, slug: str }, ['name']),
    run: (a, call) => call('POST', '/api/plugin/tags', pick(a, ['name', 'slug'])),
  },
  {
    name: 'upload_image',
    description: '上传图片，返回可写进正文的 url。传 url（从网上拉取）或 base64 二选一。',
    inputSchema: obj({
      url: { ...str, description: '图片的 http(s) 地址' },
      base64: { ...str, description: '图片内容的 base64（可带 data: 前缀）' },
      filename: str,
      visibility: { type: 'string', enum: ['public', 'private'] },
    }),
    run: async () => undefined, // handled in callTool (needs multipart)
  },
  {
    name: 'list_projects',
    description: '列出「雅集」作品。',
    inputSchema: obj({}),
    run: (_a, call) => call('GET', '/api/plugin/projects'),
  },
  {
    name: 'create_project',
    description: '在「雅集」新增作品。',
    inputSchema: obj({ name: str, url: str, description: str, image: str }, ['name', 'url']),
    run: (a, call) => call('POST', '/api/plugin/projects', pick(a, ['name', 'url', 'description', 'image'])),
  },
  {
    name: 'update_project',
    description: '修改「雅集」作品。',
    inputSchema: obj({ id: str, name: str, url: str, description: str, image: str }, ['id']),
    run: (a, call) =>
      call('PATCH', `/api/plugin/projects/${enc(String(a.id))}`, pick(a, ['name', 'url', 'description', 'image'])),
  },
  {
    name: 'delete_project',
    description: '删除「雅集」作品（调用前先和用户确认）。',
    inputSchema: obj({ id: str }, ['id']),
    run: (a, call) => call('DELETE', `/api/plugin/projects/${enc(String(a.id))}`),
  },
]

class ToolError extends Error {}

function internalBase() {
  // The standalone server binds HOSTNAME (the container name in Docker), not always 127.0.0.1.
  const host = process.env.MCP_INTERNAL_HOST || process.env.HOSTNAME || '127.0.0.1'
  return `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${process.env.PORT || 3000}`
}

function makeCaller(apiKey: string): Caller {
  return async (method, path, body) => {
    const res = await fetch(internalBase() + path, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    const text = await res.text()
    let data: unknown = text
    try {
      data = text ? JSON.parse(text) : null
    } catch {}
    if (!res.ok) {
      const msg = data && typeof data === 'object' && 'error' in data ? String((data as Json).error) : text
      throw new ToolError(`${res.status}: ${msg || res.statusText}`)
    }
    return data
  }
}

async function uploadImage(args: Json, apiKey: string) {
  let bytes: Buffer
  let type = 'application/octet-stream'
  if (typeof args.url === 'string' && args.url) {
    if (!/^https?:\/\//i.test(args.url)) throw new ToolError('url 必须是 http(s) 地址')
    const r = await fetch(args.url, { signal: AbortSignal.timeout(20000) })
    if (!r.ok) throw new ToolError(`下载图片失败：${r.status}`)
    type = r.headers.get('content-type')?.split(';')[0] || type
    bytes = Buffer.from(await r.arrayBuffer())
  } else if (typeof args.base64 === 'string' && args.base64) {
    const m = args.base64.match(/^data:([^;,]+);base64,([\s\S]*)$/)
    if (m) type = m[1]
    bytes = Buffer.from(m ? m[2] : args.base64, 'base64')
  } else {
    throw new ToolError('需要 url 或 base64')
  }
  if (bytes.length === 0) throw new ToolError('图片为空')
  if (bytes.length > 10 * 1024 * 1024) throw new ToolError('图片超过 10MB')
  const name =
    (typeof args.filename === 'string' && args.filename) ||
    (typeof args.url === 'string' && args.url.split('?')[0].split('/').pop()) ||
    'image'
  const form = new FormData()
  form.set('file', new Blob([new Uint8Array(bytes)], { type }), name)
  form.set('visibility', args.visibility === 'private' ? 'private' : 'public')
  const res = await fetch(internalBase() + '/api/plugin/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const data = (await res.json().catch(() => ({}))) as Json
  if (!res.ok) throw new ToolError(`${res.status}: ${String(data.error || res.statusText)}`)
  return data
}

async function callTool(name: string, args: Json, apiKey: string) {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) throw new ToolError(`未知工具：${name}`)
  if (name === 'upload_image') return uploadImage(args, apiKey)
  return tool.run(args, makeCaller(apiKey))
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

async function handleMessage(msg: Json, apiKey: string) {
  const id = msg.id
  const method = String(msg.method || '')
  const params = (msg.params && typeof msg.params === 'object' ? msg.params : {}) as Json
  const isNotification = id === undefined
  switch (method) {
    case 'initialize': {
      const asked = String(params.protocolVersion || '')
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      })
    }
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      })
    case 'tools/call': {
      const name = String(params.name || '')
      const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Json
      try {
        const out = await callTool(name, args, apiKey)
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return rpcResult(id, { content: [{ type: 'text', text: message }], isError: true })
      }
    }
    default:
      if (isNotification || method.startsWith('notifications/')) return null
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

export async function POST(req: Request) {
  // Any valid key may connect; each tool checks its own permission downstream.
  const auth = await requireApiKey(req)
  if (!auth.ok) {
    return NextResponse.json(rpcError(null, -32001, auth.error || '未授权'), {
      status: auth.status,
      headers: { ...auth.headers, 'WWW-Authenticate': 'Bearer' },
    })
  }
  const apiKey = extractApiKey(req)!
  let body: unknown
  try {
    body = await readJsonBody(req, 11 * 1024 * 1024)
  } catch (error) {
    if (error instanceof RequestBodyError) return bodyErrorResponse(error)
    return NextResponse.json(rpcError(null, -32700, 'Parse error'), { status: 400 })
  }
  const batch = Array.isArray(body)
  const messages = (batch ? body : [body]) as Json[]
  const replies = (await Promise.all(messages.map((m) => handleMessage(m, apiKey)))).filter(Boolean)
  if (replies.length === 0) return new Response(null, { status: 202 })
  return NextResponse.json(batch ? replies : replies[0])
}

export async function GET() {
  return new Response('MCP endpoint: POST JSON-RPC with Authorization: Bearer <API Key>', {
    status: 405,
    headers: { Allow: 'POST' },
  })
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } })
}
