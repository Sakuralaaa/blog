import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/series - existing series names with post count and highest order,
// so the editor can suggest a name and the next part number.
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const rows = await prisma.post.groupBy({
    by: ['series'],
    where: { series: { not: null } },
    _count: { _all: true },
    _max: { seriesOrder: true },
    orderBy: { series: 'asc' },
  })

  return NextResponse.json({
    series: rows
      .filter((row) => row.series)
      .map((row) => ({ name: row.series as string, posts: row._count._all, maxOrder: row._max.seriesOrder ?? 0 })),
  })
}
