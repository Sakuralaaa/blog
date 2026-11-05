import { NextRequest, NextResponse } from 'next/server'
import { buildContentSecurityPolicy } from '@/lib/csp'

const cspHeader = buildContentSecurityPolicy({
  rawScriptOrigins: process.env.HEAD_INJECT_SCRIPT_ORIGINS || '',
  allowUnsafeInlineScript: process.env.CSP_ALLOW_UNSAFE_INLINE_SCRIPT !== 'false',
})

// Authentication is enforced at each server page and route. Avoid loading the
// authentication/database stack for every public asset and navigation request.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const siteUrl = new URL(process.env.NEXTAUTH_URL || request.url)
    if (process.env.NODE_ENV === 'development') {
      // Next.js can normalize local IPs to localhost in request.url.
      // Match the actual browser destination, including its development port.
      siteUrl.protocol = request.nextUrl.protocol
      siteUrl.host = request.headers.get('host') || request.nextUrl.host
    }
    const siteOrigin = siteUrl.origin
    if ((origin && origin !== siteOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: '不允许跨站请求' }, { status: 403 })
    }
    const limit = path.includes('/import-export') ? 51 * 1024 * 1024
      : (path === '/api/admin/files' || path === '/api/plugin/images' || path === '/api/mcp') ? 11 * 1024 * 1024 : 1024 * 1024
    if (Number(request.headers.get('content-length')) > limit) {
      return NextResponse.json({ error: '请求内容过大' }, { status: 413 })
    }
  }
  // ADMIN_FULL API keys act as the admin elsewhere, but may not mint/alter keys or
  // touch the login email/password, so a leaked key can't entrench itself.
  if (/^\/api\/admin\/(api-keys|account)(\/|$)/.test(path)) {
    const authz = request.headers.get('authorization') || ''
    if (request.headers.get('x-api-key') || /^Bearer\s+eak_/i.test(authz)) {
      return NextResponse.json({ error: 'API Key 不能管理密钥或登录账号' }, { status: 403 })
    }
  }
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader)
  // The media handler chooses its cache policy only after checking access.
  const mediaRead = path.startsWith('/api/files/') && ['GET', 'HEAD'].includes(request.method)
  if ((path.startsWith('/api/') && !mediaRead) || path.startsWith('/admin') || path.startsWith('/auth')) {
    response.headers.set('Cache-Control', 'private, no-store')
  }
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
