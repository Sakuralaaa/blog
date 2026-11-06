import { NextResponse } from 'next/server'
import { extractApiKey, hasApiKeyPermissions, requireApiKey, type ApiKeyPermission } from '@/lib/api-keys'
import { fetchRemoteImage, RemoteImageError } from '@/lib/remote-image'
import { readJsonBody, RequestBodyError, bodyErrorResponse } from '@/lib/request-body'

// Model Context Protocol endpoint (Streamable HTTP, stateless, JSON responses).
// Agents such as Claude Code and Codex connect with the blog URL + an API key created
// under 后台 → API Key. Every tool forwards to the existing /api/plugin/* routes, so the
// key's permissions, rate limits and validation all apply unchanged.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const SERVER_INFO = { name: 'lagoon', version: '1.4.7' }
const INSTRUCTIONS = `个人网站（作品集 + 博客）。文章正文是 Markdown / MDX。
- 新文章默认存为草稿（status=DRAFT），确认后再用 update_post 设 status=PUBLISHED 发布。
- tags 传标签 ID 数组；先用 list_tags 查，没有就 create_tag。分类同理（list_categories / create_category）。
- 分类表示文章类型（如 教程 / 项目推荐 / 我的项目 / 随笔），主题用标签。连载文章填 series（系列名）和 seriesOrder（第几篇），前台会自动生成系列目录和上下篇。
- 图片先用 upload_image 上传，再把返回的 url 写进正文或 coverImage。
- 「作品」页（/projects，首页也会展示精选作品）用 list_projects / create_project / update_project / delete_project 管理；image 填封面图 url。
- 以下工具需要密钥带「完全管理」(ADMIN_FULL) 权限：
  - 个人资料与站点设置：get_settings 查看全部设置项，update_settings 批量修改。常用 key：site.ownerName（名字）、site.defaultAvatarUrl（头像）、site.title、site.description、site.logoUrl、site.faviconUrl、profile.tagline / signature / role / location / bio / techStack / hobbies / contactIntro / contactEmail / contactGithub / contactX / contactBilibili / contactQQ。value 的结构照 get_settings 返回的原样（如 {"text": "..."}、{"url": "..."}、{"name": "..."}）。
  - 评论：list_comments / moderate_comment / delete_comment；用户：list_users / set_user_role / delete_user；文件：list_files / delete_file；统计：get_stats。
  - 其余后台接口用 admin_request 直接调用 /api/admin/*（密钥和登录账号相关接口除外）。删除类操作先和用户确认。`

type Json = Record<string, unknown>
type Tool = {
  name: string
  description: string
  inputSchema: Json
  run: (args: Json, call: Caller) => Promise<unknown>
  admin?: boolean
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
  series: { type: ['string', 'null'], description: '系列名，同名的文章归为一个系列；传 null 或空串移出系列' },
  seriesOrder: { type: ['integer', 'null'], minimum: 1, maximum: 9999, description: '在系列里的序号（第几篇），从 1 开始' },
  tags: { type: 'array', items: str, description: '标签 ID 数组' },
  locale: { type: 'string', enum: ['zh', 'en'] },
}
const obj = (properties: Json, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false })
const pick = (args: Json, keys: string[]) => Object.fromEntries(keys.filter((k) => args[k] !== undefined).map((k) => [k, args[k]]))
const enc = encodeURIComponent
const query = (args: Json, keys: string[]) => {
  const q = new URLSearchParams()
  for (const k of keys) if (args[k] !== undefined && args[k] !== '') q.set(k, String(args[k]))
  return q.toString()
}

const PROJECT_FIELDS = ['name', 'slug', 'url', 'description', 'image', 'role', 'period', 'tags', 'gallery', 'content']
const PROJECT_SCHEMA = Object.fromEntries(PROJECT_FIELDS.map((field) => [field, str]))

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
    description: '列出「作品」页的作品与项目。',
    inputSchema: obj({}),
    run: (_a, call) => call('GET', '/api/plugin/projects'),
  },
  {
    name: 'create_project',
    description:
      '在「作品」页新增作品（name 必填）。点开作品是详情页：image 封面，role 担任角色，period 时间（如 2025.03 – 2025.06），tags 逗号分隔，gallery 每行一个截图 url，content 为 Markdown 介绍正文，url 为访问链接，slug 为详情页路径。',
    inputSchema: obj(PROJECT_SCHEMA, ['name']),
    run: (a, call) => call('POST', '/api/plugin/projects', pick(a, PROJECT_FIELDS)),
  },
  {
    name: 'update_project',
    description: '修改「作品」页的作品。',
    inputSchema: obj({ id: str, ...PROJECT_SCHEMA }, ['id']),
    run: (a, call) =>
      call('PATCH', `/api/plugin/projects/${enc(String(a.id))}`, pick(a, PROJECT_FIELDS)),
  },
  {
    name: 'delete_project',
    description: '删除「作品」页的作品（调用前先和用户确认）。',
    inputSchema: obj({ id: str }, ['id']),
    run: (a, call) => call('DELETE', `/api/plugin/projects/${enc(String(a.id))}`),
  },
  {
    name: 'get_settings',
    description: '读取全部站点设置与个人资料（需「完全管理」权限）。',
    inputSchema: obj({ group: { ...str, description: '可选，只看某个分组，如 profile、site、display' } }),
    admin: true,
    run: async (a, call) => {
      const data = (await call('GET', '/api/admin/settings')) as { settings?: Array<Json> }
      const list = data?.settings ?? []
      return a.group ? list.filter((s) => s.group === a.group) : list
    },
  },
  {
    name: 'update_settings',
    description:
      '批量修改站点设置 / 个人资料（需「完全管理」权限）。updates 为 [{ key, value }]，value 结构与 get_settings 返回一致，例如 { key: "profile.bio", value: { text: "..." } }。',
    inputSchema: obj(
      {
        updates: {
          type: 'array',
          items: { type: 'object', properties: { key: str, value: {} }, required: ['key', 'value'] },
        },
      },
      ['updates']
    ),
    admin: true,
    run: (a, call) => call('PATCH', '/api/admin/settings', { updates: a.updates }),
  },
  {
    name: 'list_comments',
    description: '列出评论，可按状态筛选（需「完全管理」权限）。',
    inputSchema: obj({
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      status: { type: 'string', enum: ['APPROVED', 'PENDING', 'SPAM', 'REJECTED'] },
    }),
    admin: true,
    run: (a, call) => call('GET', `/api/admin/comments?${query(a, ['page', 'limit', 'status'])}`),
  },
  {
    name: 'moderate_comment',
    description: '修改评论状态：通过 / 待审 / 垃圾 / 拒绝（需「完全管理」权限）。',
    inputSchema: obj({ id: str, status: { type: 'string', enum: ['APPROVED', 'PENDING', 'SPAM', 'REJECTED'] } }, ['id', 'status']),
    admin: true,
    run: (a, call) => call('PATCH', `/api/admin/comments/${enc(String(a.id))}`, { status: a.status }),
  },
  {
    name: 'delete_comment',
    description: '删除评论（不可恢复，先和用户确认；需「完全管理」权限）。',
    inputSchema: obj({ id: str }, ['id']),
    admin: true,
    run: (a, call) => call('DELETE', `/api/admin/comments/${enc(String(a.id))}`),
  },
  {
    name: 'list_users',
    description: '列出用户（需「完全管理」权限）。',
    inputSchema: obj({
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      search: str,
      role: { type: 'string', enum: ['USER', 'ADMIN'] },
    }),
    admin: true,
    run: (a, call) => call('GET', `/api/admin/users?${query(a, ['page', 'limit', 'search', 'role'])}`),
  },
  {
    name: 'set_user_role',
    description: '修改用户角色（需「完全管理」权限）。',
    inputSchema: obj({ id: str, role: { type: 'string', enum: ['USER', 'ADMIN'] } }, ['id', 'role']),
    admin: true,
    run: (a, call) => call('PATCH', `/api/admin/users/${enc(String(a.id))}`, { role: a.role }),
  },
  {
    name: 'delete_user',
    description: '删除用户（不可恢复，先和用户确认；需「完全管理」权限）。',
    inputSchema: obj({ id: str }, ['id']),
    admin: true,
    run: (a, call) => call('DELETE', `/api/admin/users/${enc(String(a.id))}`),
  },
  {
    name: 'list_files',
    description: '列出文件管理里的文件（需「完全管理」权限）。',
    inputSchema: obj({
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      q: str,
      kind: { type: 'string', enum: ['all', 'images'] },
    }),
    admin: true,
    run: (a, call) => call('GET', `/api/admin/files?${query(a, ['page', 'limit', 'q', 'kind'])}`),
  },
  {
    name: 'delete_file',
    description: '删除文件；仍被引用时需 force=true（先和用户确认；需「完全管理」权限）。',
    inputSchema: obj({ id: str, force: { type: 'boolean' } }, ['id']),
    admin: true,
    run: (a, call) => call('DELETE', `/api/admin/files/${enc(String(a.id))}${a.force ? '?force=1' : ''}`),
  },
  {
    name: 'get_stats',
    description: '后台统计概览（需「完全管理」权限）。',
    inputSchema: obj({}),
    admin: true,
    run: (_a, call) => call('GET', '/api/admin/stats'),
  },
  {
    name: 'admin_request',
    description:
      '直接调用任意后台接口 /api/admin/*（需「完全管理」权限）。path 以 /api/admin/ 开头，可带查询串；body 为 JSON。密钥管理与登录账号接口不可用。',
    inputSchema: obj(
      {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: str,
        body: {},
      },
      ['method', 'path']
    ),
    admin: true,
    run: (a, call) => {
      const path = String(a.path || '')
      if (!/^\/api\/admin\//.test(path) || path.includes('..')) throw new ToolError('path 必须以 /api/admin/ 开头')
      return call(String(a.method), path, a.body)
    },
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

async function uploadImage(args: Json, apiKey: string, permissions: ApiKeyPermission[]) {
  // Check permission before touching the network so keys without IMAGE_UPLOAD
  // cannot make the server fetch arbitrary URLs.
  if (!hasApiKeyPermissions(permissions, 'IMAGE_UPLOAD')) {
    throw new ToolError('403: 权限不足（需要「上传图片」权限）')
  }
  let bytes: Buffer
  let type = 'application/octet-stream'
  if (typeof args.url === 'string' && args.url) {
    try {
      const remote = await fetchRemoteImage(args.url)
      bytes = remote.bytes
      type = remote.type || type
    } catch (error) {
      if (error instanceof RemoteImageError) throw new ToolError(error.message)
      throw error
    }
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

async function callTool(name: string, args: Json, apiKey: string, permissions: ApiKeyPermission[]) {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) throw new ToolError(`未知工具：${name}`)
  if (name === 'upload_image') return uploadImage(args, apiKey, permissions)
  if (tool.admin && !hasApiKeyPermissions(permissions, 'ADMIN_FULL')) {
    throw new ToolError('403: 权限不足（需要「完全管理」权限，请在后台 → 接口密钥 里勾选）')
  }
  return tool.run(args, makeCaller(apiKey))
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

async function handleMessage(msg: Json, apiKey: string, permissions: ApiKeyPermission[]) {
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
        const out = await callTool(name, args, apiKey, permissions)
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
  if (messages.length > 20) {
    return NextResponse.json(rpcError(null, -32600, '单次批量请求最多 20 条'), { status: 400 })
  }
  const permissions = auth.apiKey?.permissions ?? []
  const replies = (
    await Promise.all(messages.map((m) => handleMessage(m, apiKey, permissions)))
  ).filter(Boolean)
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
