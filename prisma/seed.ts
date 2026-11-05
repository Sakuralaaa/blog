import { createHash } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'


const prisma = new PrismaClient()

async function main() {
  // 创建默认系统设置
  type SeedSetting = {
    key: string
    value: Prisma.InputJsonValue
    group: string
    editable: boolean
    secret?: boolean
  }

  const settings: SeedSetting[] = [
    { key: 'site.title', value: { title: '个人主页' }, group: 'site', editable: true },
    { key: 'site.description', value: { description: '作品、项目与文章' }, group: 'site', editable: true },
    { key: 'site.ownerName', value: { name: '你的名字' }, group: 'site', editable: true },
    { key: 'site.logoUrl', value: { url: '' }, group: 'site', editable: true },
    { key: 'site.faviconUrl', value: { url: '' }, group: 'site', editable: true },
    { key: 'posts.perPage', value: { perPage: 10 }, group: 'display', editable: true },
    { key: 'site.defaultTheme', value: { theme: 'system' }, group: 'display', editable: true },
    { key: 'site.defaultAvatarUrl', value: { url: '' }, group: 'site', editable: true },
    { key: 'ui.hideAdminEntry', value: { enabled: false }, group: 'ui', editable: true },
    { key: 'ui.style', value: { value: 'atoll' }, group: 'ui', editable: true },
    { key: 'ui.allowStyleSwitch', value: { enabled: true }, group: 'ui', editable: true },
    { key: 'hero.typingTitles', value: { text: '' }, group: 'hero', editable: true },
    { key: 'hero.subtitle', value: { text: '在这里用一句话介绍你自己：你在做什么、擅长什么、正在寻找什么机会。' }, group: 'hero', editable: true },
    { key: 'hero.location', value: { text: '' }, group: 'hero', editable: true },
    { key: 'profile.tagline', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.signature', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.role', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.location', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.joinedYear', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.bio', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.techStack', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.hobbies', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.contactIntro', value: { text: '欢迎就合作、工作机会或作品交流联系我。' }, group: 'profile', editable: true },
    { key: 'profile.contactEmail', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.contactGithub', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.contactX', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.contactBilibili', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.contactQQ', value: { text: '' }, group: 'profile', editable: true },
    { key: 'profile.social.github.enabled', value: { enabled: true }, group: 'profile', editable: true },
    { key: 'profile.social.x.enabled', value: { enabled: true }, group: 'profile', editable: true },
    { key: 'profile.social.bilibili.enabled', value: { enabled: true }, group: 'profile', editable: true },
    { key: 'profile.social.email.enabled', value: { enabled: true }, group: 'profile', editable: true },
    { key: 'profile.social.qq.enabled', value: { enabled: true }, group: 'profile', editable: true },
    { key: 'comments.enabled', value: { enabled: true }, group: 'comments', editable: true },
    { key: 'comments.moderationRequired', value: { moderationRequired: false }, group: 'comments', editable: true },
    { key: 'comments.allowGuest', value: { enabled: false }, group: 'comments', editable: true },
    { key: 'comments.guestModerationRequired', value: { enabled: false }, group: 'comments', editable: true },
    { key: 'auth.allowRegistration', value: { allow: true }, group: 'auth', editable: true },
    { key: 'email.enabled', value: { enabled: false }, group: 'email', editable: true },
    { key: 'email.from', value: { from: '网站通知' }, group: 'email', editable: true },
    { key: 'email.reply.enabled', value: { enabled: true }, group: 'email', editable: true },
    { key: 'email.reply.requireApproved', value: { enabled: true }, group: 'email', editable: true },
    { key: 'email.reply.unsubscribeEnabled', value: { enabled: true }, group: 'email', editable: true },
    { key: 'email.reply.unsubscribeList', value: { text: '' }, group: 'email', editable: false },
    // AI 设置（单机 + OpenAI 兼容）
    { key: 'ai.enabled', value: { value: false }, group: 'ai', editable: true },
    { key: 'ai.provider', value: { value: 'openai-compatible' }, group: 'ai', editable: true },
    { key: 'ai.openai.baseUrl', value: { value: '' }, group: 'ai', editable: true },
    { key: 'ai.openai.apiKey', value: { value: '' }, group: 'ai', editable: false, secret: true },
    { key: 'ai.chat.model', value: { value: 'gpt-4o-mini' }, group: 'ai', editable: true },
    { key: 'ai.embedding.model', value: { value: 'text-embedding-3-small' }, group: 'ai', editable: true },
    { key: 'ai.embedding.dimensions', value: { value: 1536 }, group: 'ai', editable: true },
    { key: 'ai.rag.topK', value: { value: 8 }, group: 'ai', editable: true },
    { key: 'ai.rag.minScore', value: { value: 0.2 }, group: 'ai', editable: true },
    { key: 'ai.answer.maxTokens', value: { value: 32768 }, group: 'ai', editable: true },
    // 页脚设置
    { key: 'site.footer_icp', value: { value: '' }, group: 'site', editable: true },
    { key: 'site.footer_mps', value: { value: '' }, group: 'site', editable: true },
    { key: 'site.footer_copyright', value: { value: '' }, group: 'site', editable: true },
    { key: 'site.footer_powered_by_enabled', value: { enabled: false }, group: 'site', editable: true },
    { key: 'site.footer_powered_by', value: { value: '' }, group: 'site', editable: true },
    // Gotify 通知默认配置
    { key: 'notifications.gotify.enabled', value: { enabled: false }, group: 'notifications', editable: true },
    { key: 'notifications.gotify.url', value: { url: '' }, group: 'notifications', editable: true },
    { key: 'notifications.gotify.notifyNewComment', value: { enabled: true }, group: 'notifications', editable: true },
    { key: 'notifications.gotify.notifyPendingComment', value: { enabled: true }, group: 'notifications', editable: true },
    // token 为 secret，不能通过通用 PATCH 更新（可通过单独接口设置）
    { key: 'notifications.gotify.token', value: { token: '' }, group: 'notifications', editable: false, secret: true },
    // 管理员初始化提示
    { key: 'admin.initialSetup', value: { enabled: true }, group: 'admin', editable: true },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      // 保留已有配置值，避免重复 seed 时覆盖管理员在后台保存的设置。
      update: { group: s.group, editable: s.editable, secret: s.secret ?? false },
      create: s,
    })
  }

  // Upgrades: values that still equal the retired upstream template defaults (old persona,
  // upstream links, placeholder ICP) are replaced with the neutral defaults above.
  // Anything an admin has edited is left untouched.
  const neutral = new Map(settings.map((s) => [s.key, s.value]))
  for (const [key, legacyHashes] of Object.entries(LEGACY_DEFAULT_HASHES)) {
    const current = await prisma.setting.findUnique({ where: { key } })
    if (!current || !neutral.has(key)) continue
    const digest = createHash('sha256').update(JSON.stringify(current.value)).digest('hex').slice(0, 24)
    if (legacyHashes.includes(digest)) {
      await prisma.setting.update({ where: { key }, data: { value: neutral.get(key)! } })
    }
  }
}

/** sha256(JSON.stringify(value)).slice(0, 24) of retired upstream template defaults. */
const LEGACY_DEFAULT_HASHES: Record<string, string[]> = {
  'site.title': ['b4901b5eb0c9ae081f7f9d2e'],
  'site.description': ['b3db0dba82914fb1b82dc3d7'],
  'site.ownerName': ['4b8b79499238d21f9b773452'],
  'hero.typingTitles': ['f3f4690d5104f70ef22f89b8'],
  'hero.subtitle': ['e6ad51f7b4c2c37e1479c427'],
  'hero.location': ['60ed13e8d1151bda9940546b'],
  'profile.tagline': ['3d2abc52213696ed1523b65d'],
  'profile.signature': ['ff6996a7e291b36a93d68a35'],
  'profile.role': ['f9413124abf4c86590f62c44'],
  'profile.location': ['3d6bb39de3992f236ef0c7c1'],
  'profile.joinedYear': ['b917be05ced2b88510a0a206'],
  'profile.bio': ['ea5e364a0032d987bfbaa8f2'],
  'profile.techStack': ['a01a64b1b6d78bc1d92faf62'],
  'profile.hobbies': ['01d303982bde30ffb88104ab'],
  'profile.contactIntro': ['35b360e0bfce9de4a5c23c13'],
  'profile.contactGithub': ['cd08071fee2f6adfadb51d66'],
  'email.from': ['ca5b4fa45ea8168f2c8cbd58'],
  'site.footer_icp': ['1220fbd518e37fae84b49a4d', '8df5a2573fd378ee890b33e7'],
  'site.footer_copyright': ['9c30390f551adf9af02b99b1'],
  'site.footer_powered_by': ['241aa041ba54b7bb61368326'],
}

main()
  .catch((e) => {
    console.error('❌ 创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
