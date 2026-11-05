import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireApiKey } from '@/lib/api-keys'
import { prisma } from '@/lib/prisma'
import { RequestBodyError, bodyErrorResponse, readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/plugin/projects/:id - 修改作品 (API Key)
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await requireApiKey(req, 'PROJECT_WRITE')
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
    const { id } = await params
    const body = await readJsonBody(req)
    const data: { name?: string; url?: string; description?: string | null; image?: string | null } = {}
    if (typeof body.name === 'string') {
      if (!body.name.trim()) return NextResponse.json({ error: '项目名称不能为空' }, { status: 400, headers: auth.headers })
      data.name = body.name.trim().slice(0, 120)
    }
    if (typeof body.url === 'string') {
      if (!/^https?:\/\//i.test(body.url.trim())) return NextResponse.json({ error: '项目链接必须是 http(s) 地址' }, { status: 400, headers: auth.headers })
      data.url = body.url.trim().slice(0, 2048)
    }
    if (body.description !== undefined) data.description = typeof body.description === 'string' && body.description.trim() ? body.description.trim().slice(0, 2000) : null
    if (body.image !== undefined) data.image = typeof body.image === 'string' && body.image.trim() ? body.image.trim().slice(0, 2048) : null
    const exists = await prisma.project.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: '作品不存在' }, { status: 404, headers: auth.headers })
    const project = await prisma.project.update({ where: { id }, data })
    revalidatePath('/yaji')
    return NextResponse.json({ project }, { headers: auth.headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return bodyErrorResponse(error)
    console.error('插件修改作品失败:', error)
    return NextResponse.json({ error: '修改作品失败' }, { status: 500 })
  }
}

// DELETE /api/plugin/projects/:id - 删除作品 (API Key)
export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireApiKey(req, 'PROJECT_WRITE')
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.headers })
  const { id } = await params
  const exists = await prisma.project.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: '作品不存在' }, { status: 404, headers: auth.headers })
  await prisma.project.delete({ where: { id } })
  revalidatePath('/yaji')
  return NextResponse.json({ ok: true }, { headers: auth.headers })
}
