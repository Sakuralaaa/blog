// Replaces settings that still hold a retired template default (the old 执笔为剑 persona,
// upstream PaperGrid links, a placeholder ICP) with today's neutral defaults.
// Runs at every container start, so sites created from old images get the new copy too.
// A value the admin has edited is never touched.
import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

/** Neutral defaults, the same values prisma/seed.ts writes into a new database. */
export const NEUTRAL_DEFAULTS = {
  'site.title': { title: '个人主页' },
  'site.description': { description: '作品、项目与文章' },
  'site.ownerName': { name: '你的名字' },
  'hero.typingTitles': { text: '' },
  'hero.subtitle': { text: '在这里用一句话介绍你自己：你在做什么、擅长什么、正在寻找什么机会。' },
  'hero.location': { text: '' },
  'profile.tagline': { text: '' },
  'profile.signature': { text: '' },
  'profile.role': { text: '' },
  'profile.location': { text: '' },
  'profile.joinedYear': { text: '' },
  'profile.bio': { text: '' },
  'profile.techStack': { text: '' },
  'profile.hobbies': { text: '' },
  'profile.contactIntro': { text: '欢迎就合作、工作机会或作品交流联系我。' },
  'profile.contactGithub': { text: '' },
  'email.from': { from: '网站通知' },
  'site.footer_icp': { value: '' },
  'site.footer_copyright': { value: '' },
  'site.footer_powered_by': { value: '' },
}

/** sha256(JSON.stringify(value)).slice(0, 24) of retired template defaults. */
export const LEGACY_DEFAULT_HASHES = {
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

/** Whole values from older templates, whatever JSON wrapper they were saved in. */
const LEGACY_STRINGS = {
  'site.title': ['执笔为剑', '执笔为剑·博客', 'PaperGrid', 'PaperGrid - 执笔为剑'],
  'site.ownerName': ['千叶'],
  'email.from': ['PaperGrid 通知', '执笔为剑'],
  'site.footer_copyright': ['千叶'],
  'site.footer_powered_by': ['by xywml', 'PaperGrid', 'Powered by PaperGrid'],
  'profile.contactGithub': ['https://github.com/xywml/PaperGrid'],
}

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)

function unwrap(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const values = Object.values(value)
    if (values.length === 1 && typeof values[0] === 'string') return values[0]
  }
  return null
}

export function isLegacyDefault(key, value) {
  if (LEGACY_DEFAULT_HASHES[key]?.includes(digest(value))) return true
  const text = unwrap(value)
  return text !== null && (LEGACY_STRINGS[key] || []).includes(text.trim())
}

export async function upgradeSettings(prisma) {
  const keys = Object.keys(NEUTRAL_DEFAULTS)
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } })
  const replaced = []
  for (const row of rows) {
    if (!isLegacyDefault(row.key, row.value)) continue
    await prisma.setting.update({ where: { key: row.key }, data: { value: NEUTRAL_DEFAULTS[row.key] } })
    replaced.push(row.key)
  }
  // The old template credited upstream in the footer; hide that line along with its text.
  if (replaced.includes('site.footer_powered_by')) {
    await prisma.setting.updateMany({
      where: { key: 'site.footer_powered_by_enabled' },
      data: { value: { enabled: false } },
    })
  }
  return replaced
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const replaced = await upgradeSettings(prisma)
    if (replaced.length) console.log(`[upgrade-settings] 已把 ${replaced.length} 项旧模板默认值换成新默认值: ${replaced.join(', ')}`)
  } catch (error) {
    // Never block startup on cosmetic copy.
    console.error('[upgrade-settings] 跳过：', error instanceof Error ? error.message : error)
  } finally {
    await prisma.$disconnect()
  }
}

// No top-level await: prisma/seed.ts and the tests import this file through tsx.
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  void main()
}
