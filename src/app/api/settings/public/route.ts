import { NextResponse } from 'next/server'
import { getPublicSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await getPublicSettings()
    const res = NextResponse.json(settings)
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return res
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
