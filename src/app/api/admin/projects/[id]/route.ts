import { Prisma } from '@prisma/client'
import { RequestBodyError, bodyErrorResponse, readJsonBody } from '@/lib/request-body'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectInputError, parseProjectInput } from '@/lib/projects'
import { revalidateProjects } from '@/lib/project-revalidate'

// PATCH /api/admin/projects/[id] - 更新作品
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { id } = await params
    const body = await readJsonBody(request)
    const data = parseProjectInput(body, true)

    const previous = await prisma.project.findUnique({ where: { id }, select: { id: true, slug: true } })
    if (!previous) return NextResponse.json({ error: '作品不存在' }, { status: 404 })

    const project = await prisma.project.update({ where: { id }, data })
    revalidateProjects(previous, project)

    return NextResponse.json({ project })
  } catch (error) {
    if (error instanceof RequestBodyError) return bodyErrorResponse(error)
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '访问路径已被其他作品使用' }, { status: 409 })
    }
    console.error('更新作品失败:', error)
    return NextResponse.json({ error: '更新作品失败' }, { status: 500 })
  }
}

// DELETE /api/admin/projects/[id] - 删除作品
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { id } = await params

    const project = await prisma.project.delete({ where: { id } })
    revalidateProjects(project)

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除作品失败:', error)
    return NextResponse.json({ error: '删除作品失败' }, { status: 500 })
  }
}
