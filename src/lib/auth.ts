import NextAuth, { CredentialsSignin, type Session } from 'next-auth'
import { headers } from 'next/headers'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { getSetting } from './settings'
import bcrypt from 'bcryptjs'
import { getClientIp, rateLimitLogin } from './rate-limit'
import { sessionStamp } from './session-stamp'
import { requireApiKey } from './api-keys'

class RateLimitError extends CredentialsSignin {
  code = 'rate_limited'
}

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials, request) {
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string' ||
            credentials.email.length > 254 || Buffer.byteLength(credentials.password) > 72) {
          return null
        }

        const clientIp = request ? getClientIp(request) : 'unknown'
        if (!rateLimitLogin(clientIp, credentials.email).ok) {
          throw new RateLimitError()
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim() },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user }) {
      const allowRegistration = (await getSetting<boolean>('auth.allowRegistration', true)) ?? true

      if (!allowRegistration) {
        const email = user?.email
        if (!email) return false
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (!existingUser) return false
      }

      return true
    },
    async jwt({ token, user }) {
      const id = user?.id || (typeof token.id === 'string' ? token.id : undefined)
      if (!id) return null
      const current = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, password: true, role: true, sessionVersion: true, name: true, image: true },
      })
      if (!current) return null
      const stamp = sessionStamp(current)
      if (!user && token.stamp !== stamp) return null
      token.id = current.id
      token.role = current.role
      token.stamp = stamp
      token.name = current.name
      token.email = current.email
      token.picture = current.image
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'USER' | 'ADMIN'
      }
      return session
    },
  },
})

export const { handlers, signIn, signOut } = nextAuth

// An API key with the ADMIN_FULL permission acts as its (admin) creator on every
// route that checks `await auth()`, so agents can do anything the admin backend can.
// Key management and the account (email/password) routes are blocked for keys in proxy.ts.
async function apiKeyAdminSession(): Promise<Session | null> {
  let h: Headers
  try {
    h = new Headers(await headers())
  } catch {
    return null // outside a request (build / static generation)
  }
  const authz = h.get('authorization') || ''
  if (!h.get('x-api-key') && !/^Bearer\s+eak_/i.test(authz)) return null
  const result = await requireApiKey(new Request('http://internal.local/', { headers: h }), 'ADMIN_FULL')
  const creatorId = result.ok ? result.apiKey?.createdById : null
  if (!creatorId) return null
  const user = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true, email: true, name: true, image: true, role: true },
  })
  if (!user || user.role !== 'ADMIN') return null
  return {
    user: { id: user.id, email: user.email ?? '', name: user.name, image: user.image, role: 'ADMIN' },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as Session
}

export async function auth(): Promise<Session | null> {
  const session = await nextAuth.auth()
  if (session?.user) return session
  return apiKeyAdminSession()
}
