import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { generateReplyUnsubscribeToken } from './email-reply-unsubscribe'
import { sendSmtpMail } from './smtp'

type CommentStatus = 'PENDING' | 'APPROVED' | 'SPAM' | 'REJECTED'

export type CommentEmailNotificationInput = {
  status: CommentStatus
  id: string
  content: string
  createdAt: Date
  authorName: string | null
  authorEmail: string | null
  author: {
    name: string | null
    email: string | null
    image: string | null
  } | null
  post: {
    title: string
    slug: string
  }
}

export type CommentReplyEmailNotificationInput = {
  status: CommentStatus
  id: string
  content: string
  createdAt: Date
  authorName: string | null
  authorEmail: string | null
  author: {
    name: string | null
    email: string | null
  } | null
  post: {
    title: string
    slug: string
  }
  parent: {
    id: string
    content: string
    authorName: string | null
    authorEmail: string | null
    author: {
      name: string | null
      email: string | null
    } | null
  }
}

export type EmailTestNotificationInput = {
  title?: string
  message?: string
}

export class EmailServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'EmailServiceError'
    this.status = status
  }
}

function resolveFromAddressFromSmtpUser(): string {
  const smtpUser = normalizeEmail(process.env.SMTP_USER || '')
  const emailOk = isEmail(smtpUser)
  if (!emailOk) {
    throw new EmailServiceError('SMTP_USER 未配置或格式不正确，无法作为发件地址', 400)
  }
  return smtpUser
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function isEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)
}

function normalizeEmails(raw: string): string[] {
  if (!raw) return []
  const parts = raw
    .split(/[,\n;\s]+/)
    .map((it) => normalizeEmail(it))
    .filter(Boolean)

  const seen = new Set<string>()
  const result: string[] = []
  for (const email of parts) {
    if (!isEmail(email)) continue
    if (seen.has(email)) continue
    seen.add(email)
    result.push(email)
  }
  return result
}

function summarize(text: string, limit: number): string {
  if (!text) return ''
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

async function resolveAdminRecipients(): Promise<string[]> {
  const envRecipients = normalizeEmails(process.env.EMAIL_TO || '')
  if (envRecipients.length > 0) {
    return envRecipients
  }

  const adminUsers = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      email: { not: null },
    },
    select: { email: true },
  })

  const adminEmails = adminUsers
    .map((item) => item.email || '')
    .filter(Boolean)
    .join(',')
  const recipients = normalizeEmails(adminEmails)
  if (recipients.length === 0) {
    throw new EmailServiceError('未找到可用收件人，请配置 EMAIL_TO 或管理员邮箱', 400)
  }
  return recipients
}

function resolveAppBaseUrl(): string | null {
  const baseUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim()
  if (!baseUrl) return null
  try {
    return new URL(baseUrl).toString()
  } catch {
    return null
  }
}

function buildAdminCommentsUrl(): string {
  const baseUrl = resolveAppBaseUrl()
  if (!baseUrl) return '/admin/comments'
  try {
    return new URL('/admin/comments', baseUrl).toString()
  } catch {
    return '/admin/comments'
  }
}

function buildPostUrl(slug: string, commentId?: string): string {
  const suffix = commentId ? `#comment-${commentId}` : ''
  const baseUrl = resolveAppBaseUrl()
  if (!baseUrl) return `/posts/${encodeURIComponent(slug)}${suffix}`
  try {
    return new URL(`/posts/${encodeURIComponent(slug)}${suffix}`, baseUrl).toString()
  } catch {
    return `/posts/${encodeURIComponent(slug)}${suffix}`
  }
}

function buildReplyUnsubscribeUrl(email: string): string | null {
  const baseUrl = resolveAppBaseUrl()
  if (!baseUrl) return null
  try {
    const token = generateReplyUnsubscribeToken(email)
    const url = new URL('/api/comments/unsubscribe', baseUrl)
    url.searchParams.set('email', email)
    url.searchParams.set('token', token)
    return url.toString()
  } catch {
    return null
  }
}

async function sendNotificationMail(
  subject: string,
  content: string,
  recipients?: string[]
): Promise<void> {
  const [siteTitleRaw, displayNameRaw, resolvedRecipients] = await Promise.all([
    getSetting<string>('site.title', '个人主页'),
    getSetting<string>('email.from', ''),
    recipients && recipients.length > 0 ? Promise.resolve(recipients) : resolveAdminRecipients(),
  ])
  const siteTitle = (siteTitleRaw || '个人主页').toString().trim() || '个人主页'
  const displayName = (displayNameRaw || '').toString().replace(/[\r\n]/g, ' ').trim() || siteTitle
  const fromAddress = resolveFromAddressFromSmtpUser()
  const from = `${displayName} <${fromAddress}>`

  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await sendSmtpMail({
        from,
        to: resolvedRecipients,
        subject,
        text: content,
      })
      return
    } catch (error) {
      lastError = error
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }
  }
  throw lastError
}

export async function sendCommentEmailNotification(input: CommentEmailNotificationInput): Promise<void> {
  const enabled = (await getSetting<boolean>('email.enabled', false)) ?? false
  if (!enabled) return

  const shouldNotify = input.status === 'PENDING' || input.status === 'APPROVED'
  if (!shouldNotify) return

  const authorLabel = input.author?.name || input.authorName || '匿名用户'
  const summary = summarize(input.content, 160)
  const timeLabel = new Date(input.createdAt).toLocaleString('zh-CN', { hour12: false })
  const title = input.status === 'PENDING'
    ? `评论待审核：${input.post.title}`
    : `新评论提醒：${input.post.title}`
  const message = [
    `文章：${input.post.title}`,
    `状态：${input.status === 'PENDING' ? '待审核' : '已通过'}`,
    `作者：${authorLabel}`,
    `时间：${timeLabel}`,
    `摘要：${summary}`,
    `评论链接：${buildPostUrl(input.post.slug, input.id)}`,
    `后台处理：${buildAdminCommentsUrl()}`,
  ].join('\n')

  await sendNotificationMail(title, message)
}

export async function sendCommentReplyEmailNotification(input: CommentReplyEmailNotificationInput): Promise<void> {
  const [emailEnabledRaw, replyEnabledRaw, requireApprovedRaw, unsubscribeEnabledRaw, unsubscribeListRaw] = await Promise.all([
    getSetting<boolean>('email.enabled', false),
    getSetting<boolean>('email.reply.enabled', true),
    getSetting<boolean>('email.reply.requireApproved', true),
    getSetting<boolean>('email.reply.unsubscribeEnabled', true),
    getSetting<string>('email.reply.unsubscribeList', ''),
  ])

  const emailEnabled = emailEnabledRaw ?? false
  const replyEnabled = replyEnabledRaw ?? true
  const requireApproved = requireApprovedRaw ?? true
  const unsubscribeEnabled = unsubscribeEnabledRaw ?? true
  if (!emailEnabled || !replyEnabled) return
  if (requireApproved && input.status !== 'APPROVED') return

  const recipient = normalizeEmail(input.parent.author?.email || input.parent.authorEmail || '')
  if (!isEmail(recipient)) return

  const actorEmail = normalizeEmail(input.author?.email || input.authorEmail || '')
  if (actorEmail && actorEmail === recipient) return

  const envDenylist = normalizeEmails(process.env.EMAIL_REPLY_DENYLIST || '')
  const unsubscribedList = normalizeEmails(unsubscribeListRaw || '')
  const denySet = new Set<string>([...envDenylist, ...unsubscribedList])
  if (denySet.has(recipient)) return

  const actorName = input.author?.name || input.authorName || '匿名用户'
  const parentAuthorName = input.parent.author?.name || input.parent.authorName || '你'
  const postUrl = buildPostUrl(input.post.slug, input.id)
  const unsubscribeUrl = unsubscribeEnabled ? buildReplyUnsubscribeUrl(recipient) : null

  const subject = `有人回复了你的评论：${input.post.title}`
  const message = [
    `${parentAuthorName}，你好：`,
    '',
    `${actorName} 回复了你在《${input.post.title}》下的评论。`,
    `你的原评论：${summarize(input.parent.content, 120)}`,
    `Ta 的回复：${summarize(input.content, 180)}`,
    `时间：${new Date(input.createdAt).toLocaleString('zh-CN', { hour12: false })}`,
    '',
    `查看全文：${postUrl}`,
    ...(unsubscribeUrl ? [`退订回复通知：${unsubscribeUrl}`] : []),
  ].join('\n')

  await sendNotificationMail(subject, message, [recipient])
}

export async function sendEmailTestNotification(input: EmailTestNotificationInput): Promise<void> {
  const enabled = (await getSetting<boolean>('email.enabled', false)) ?? false
  if (!enabled) {
    throw new EmailServiceError('邮件通知未启用', 400)
  }

  const title = input.title?.trim() || '测试邮件'
  const message = input.message?.trim() || '这是一封 SMTP 测试通知'
  await sendNotificationMail(title, message)
}
