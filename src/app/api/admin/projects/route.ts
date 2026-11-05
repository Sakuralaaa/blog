import { Prisma } from '@prisma/client'
import { RequestBodyError, bodyErrorResponse, readJsonBody } from '@/lib/request-body'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectInputError, parseProjectInput, type ProjectInput } from '@/lib/projects'
import { revalidateProjects } from '@/lib/project-revalidate'

// GET /api/admin/projects - 获取作品列表
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('获取作品失败:', error)
    return NextResponse.json({ error: '获取作品失败' }, { status: 500 })
  }
}

// POST /api/admin/projects - 创建作品
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await readJsonBody(request)
    const data = parseProjectInput(body, false) as ProjectInput
    const project = await prisma.project.create({ data })
    revalidateProjects(project)

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    if (error instanceof RequestBodyError) return bodyErrorResponse(error)
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '访问路径已被其他作品使用' }, { status: 409 })
    }
    console.error('创建作品失败:', error)
    return NextResponse.json({ error: '创建作品失败' }, { status: 500 })
  }
}
