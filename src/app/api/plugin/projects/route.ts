import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireApiKey } from '@/lib/api-keys'
import { prisma } from '@/lib/prisma'
import { RequestBodyError, bodyErrorResponse, readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'

function text(v: unknown, max: number) {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

// GET /api/plugin/projects - 作品列表 (API Key)
export async function GET(req: Request) {
  const auth = await requireApiKey(req, 'PROJECT_READ')
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ projects }, { headers: auth.headers })
}

// POST /api/plugin/projects - 新增作品 (API Key)
export async function POST(req: Request) {
  try {
    const auth = await requireApiKey(req, 'PROJECT_WRITE')
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
    const body = await readJsonBody(req)
    const name = text(body.name, 120)
    const url = text(body.url, 2048)
    if (!name) return NextResponse.json({ error: '项目名称不能为空' }, { status: 400, headers: auth.headers })
    if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: '项目链接必须是 http(s) 地址' }, { status: 400, headers: auth.headers })
    const project = await prisma.project.create({
      data: { name, url, description: text(body.description, 2000) || null, image: text(body.image, 2048) || null },
    })
    revalidatePath('/yaji')
    return NextResponse.json({ project }, { status: 201, headers: auth.headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return bodyErrorResponse(error)
    console.error('插件创建作品失败:', error)
    return NextResponse.json({ error: '创建作品失败' }, { status: 500 })
  }
}
