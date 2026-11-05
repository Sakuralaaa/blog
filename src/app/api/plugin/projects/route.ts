import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireApiKey } from '@/lib/api-keys'
import { prisma } from '@/lib/prisma'
import { RequestBodyError, bodyErrorResponse, readJsonBody } from '@/lib/request-body'
import { ProjectInputError, parseProjectInput, type ProjectInput } from '@/lib/projects'
import { revalidateProjects } from '@/lib/project-revalidate'

export const dynamic = 'force-dynamic'

// GET /api/plugin/projects - 作品列表 (API Key)
export async function GET(req: Request) {
  const auth = await requireApiKey(req, 'PROJECT_READ')
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ projects }, { headers: auth.headers })
}

// POST /api/plugin/projects - 新增作品 (API Key)
export async function POST(req: Request) {
  const auth = await requireApiKey(req, 'PROJECT_WRITE')
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
  try {
    const body = await readJsonBody(req)
    const data = parseProjectInput(body, false) as ProjectInput
    const project = await prisma.project.create({ data })
    revalidateProjects(project)
    return NextResponse.json({ project }, { status: 201, headers: auth.headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return bodyErrorResponse(error)
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: auth.headers })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '访问路径已被其他作品使用' }, { status: 409, headers: auth.headers })
    }
    console.error('插件创建作品失败:', error)
    return NextResponse.json({ error: '创建作品失败' }, { status: 500, headers: auth.headers })
  }
}
