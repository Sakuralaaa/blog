import Link from 'next/link'
import { ArrowUpRight, Github, Mail, MapPin } from 'lucide-react'
import { isValidHref } from '@/lib/utils'

function parseStack(raw: string) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.search(/[:：]/)
      const label = idx > 0 ? line.slice(0, idx).trim() : ''
      const items = (idx > 0 ? line.slice(idx + 1) : line)
        .split(/[,，、/]/)
        .map((it) => it.trim())
        .filter(Boolean)
      return { label, items }
    })
    .filter((row) => row.items.length > 0)
    .slice(0, 5)
}

export function HeroSection({ settings = {} }: { settings?: Record<string, unknown> }) {
  const str = (key: string, fallback = '') =>
    typeof settings[key] === 'string' ? String(settings[key]) : fallback
  const lines = str('hero.typingTitles', '你好，欢迎来到这里')
    .split(/[\n|｜]/)
    .map((line) => line.trim())
    .filter(Boolean)
  const title = lines[0] || '你好，欢迎来到这里'
  const extra = lines.slice(1, 3)
  const commaAt = title.search(/[，,]/)
  const head = commaAt > 0 ? title.slice(0, commaAt + 1) : ''
  const tail = commaAt > 0 ? title.slice(commaAt + 1) : title
  const owner = str('site.ownerName', '博主')
  const role = str('profile.role') || str('profile.tagline')
  const location = str('hero.location') || str('profile.location')
  const avatar = str('site.defaultAvatarUrl')
  const stack = parseStack(str('profile.techStack'))
  const github = str('profile.contactGithub')
  const email = str('profile.contactEmail')

  return (
    <section className="at-hero" aria-labelledby="hero-title">
      <div className="at-surface at-hero-main">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {location && (
            <span className="at-chip">
              <MapPin size={13} aria-hidden="true" />
              {location}
            </span>
          )}
          {extra.map((t) => (
            <span key={t} className="at-chip">
              {t}
            </span>
          ))}
        </div>
        <h1 id="hero-title" className="at-hero-title">
          {head}
          {head && <br />}
          <mark>{tail}</mark>
        </h1>
        <p className="at-hero-sub">{str('hero.subtitle', '写代码，也记录生活。')}</p>
        <div className="at-hero-actions">
          <Link href="/yaji" className="at-btn at-btn-primary">
            看看作品
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <a href="#latest-posts" className="at-btn">
            读文章
          </a>
          <Link href="/about" className="at-btn">
            关于我
          </Link>
        </div>
      </div>

      <div className="at-hero-side">
        <div className="at-surface at-profile">
          <span className="at-avatar">
            {avatar ? <img src={avatar} alt="" /> : owner.charAt(0)}
          </span>
          <div>
            <h2>{owner}</h2>
            {role && <p>{role}</p>}
          </div>
        </div>
        <div className="at-surface at-stack">
          <span className="at-label">Stack</span>
          {stack.map((row, i) => (
            <div className="at-stack-row" key={i}>
              <span>{row.label || '—'}</span>
              <div>
                {row.items.map((it) => (
                  <span key={it} className="at-chip">
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="at-socials">
            {github && settings['profile.social.github.enabled'] !== false && isValidHref(github) && (
              <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Github size={18} />
              </a>
            )}
            {email &&
              settings['profile.social.email.enabled'] !== false &&
              isValidHref(`mailto:${email}`) && (
                <a href={`mailto:${email}`} aria-label="邮件联系">
                  <Mail size={18} />
                </a>
              )}
          </div>
        </div>
      </div>
    </section>
  )
}
