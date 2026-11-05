import Image from 'next/image'
import Link from 'next/link'
import { Github, X, Tv, Mail } from 'lucide-react'
import { isValidHref } from '@/lib/utils'
import { SITE_NAV_LINKS } from '@/lib/site-nav'

function parseMpsSetting(rawValue: string): { text: string; href: string } | null {
  const raw = rawValue.trim()
  if (!raw) return null

  const normalized = raw.replace(/\s+/g, '')
  const match = normalized.match(/^[\u4e00-\u9fa5]公网安备(\d{8,})号$/)
  if (!match) return null

  const code = match[1]
  const href = `https://beian.mps.gov.cn/#/query/websearch?code=${code}`
  return { text: normalized, href }
}

/** Compact two-row footer: identity + links, then legal line. */
export function Footer({ settings }: { settings?: Record<string, unknown> }) {
  const s: Record<string, unknown> = settings || {}
  const getStr = (key: string, fallback = '') =>
    typeof s[key] === 'string' ? (s[key] as string).trim() : fallback
  const getBool = (key: string, fallback = false) =>
    typeof s[key] === 'boolean' ? (s[key] as boolean) : fallback
  const title = getStr('site.title') || '个人主页'
  const description = getStr('site.description')
  const icp = getStr('site.footer_icp')
  const mps = parseMpsSetting(getStr('site.footer_mps'))
  const owner = getStr('site.footer_copyright') || getStr('site.ownerName') || title
  const currentYear = String(s['site.currentYear'] ?? new Date().getUTCFullYear())
  const githubUrl = getStr('profile.contactGithub')
  const xUrl = getStr('profile.contactX')
  const bilibiliUrl = getStr('profile.contactBilibili')
  const email = getStr('profile.contactEmail')
  const socials = [
    getBool('profile.social.github.enabled', true) && isValidHref(githubUrl)
      ? { href: githubUrl, label: 'GitHub', icon: Github, external: true }
      : null,
    getBool('profile.social.x.enabled', true) && isValidHref(xUrl)
      ? { href: xUrl, label: 'X', icon: X, external: true }
      : null,
    getBool('profile.social.bilibili.enabled', true) && isValidHref(bilibiliUrl)
      ? { href: bilibiliUrl, label: '哔哩哔哩', icon: Tv, external: true }
      : null,
    getBool('profile.social.email.enabled', true) && email && isValidHref(`mailto:${email}`)
      ? { href: `mailto:${email}`, label: '电子邮件', icon: Mail, external: false }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__row">
          <div className="site-footer__id">
            <strong>{title}</strong>
            {description && <span>{description}</span>}
          </div>
          <nav className="site-footer__links" aria-label="页脚导航">
            {SITE_NAV_LINKS.filter((link) => link.href !== '/').map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          {socials.length > 0 && (
            <div className="site-footer__social">
              {socials.map(({ href, label, icon: Icon, external }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="site-footer__legal">
          <span>
            © {currentYear} {owner}
          </span>
          {icp && (
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
              {icp}
            </a>
          )}
          {mps && (
            <a href={mps.href} target="_blank" rel="noopener noreferrer">
              <Image src="/assets/mps-beian-logo.png" alt="" width={14} height={14} />
              {mps.text}
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
