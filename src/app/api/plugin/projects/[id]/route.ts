import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireApiKey } from '@/lib/api-keys'
import { prisma } from '@/lib/prisma'
import { RequestBodyError, bodyErrorResponse, readJsonBody } from '@/lib/request-body'
import { ProjectInputError, parseProjectInput } from '@/lib/projects'
import { revalidateProjects } from '@/lib/project-revalidate'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/plugin/projects/:id - 修改作品 (API Key)
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiKey(req, 'PROJECT_WRITE')
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
  try {
    const { id } = await params
    const body = await readJsonBody(req)
    const data = parseProjectInput(body, true)
    const previous = await prisma.project.findUnique({ where: { id }, select: { id: true, slug: true } })
    if (!previous) return NextResponse.json({ error: '作品不存在' }, { status: 404, headers: auth.headers })
    const project = await prisma.project.update({ where: { id }, data })
    revalidateProjects(previous, project)
    return NextResponse.json({ project }, { headers: auth.headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return bodyErrorResponse(error)
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: auth.headers })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '访问路径已被其他作品使用' }, { status: 409, headers: auth.headers })
    }
    console.error('插件修改作品失败:', error)
    return NextResponse.json({ error: '修改作品失败' }, { status: 500, headers: auth.headers })
  }
}

// DELETE /api/plugin/projects/:id - 删除作品 (API Key)
export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireApiKey(req, 'PROJECT_WRITE')
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
  const { id } = await params
  const exists = await prisma.project.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!exists) return NextResponse.json({ error: '作品不存在' }, { status: 404, headers: auth.headers })
  await prisma.project.delete({ where: { id } })
  revalidateProjects(exists)
  return NextResponse.json({ ok: true }, { headers: auth.headers })
}
