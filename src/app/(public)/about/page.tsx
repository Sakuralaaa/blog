import type { Metadata } from 'next'
import { Mail, Github, X, Tv, MapPin, Calendar, MessageSquareHeart, ArrowUpRight } from 'lucide-react'
import { getSetting } from '@/lib/settings'
import { AboutAvatarTrigger } from '@/components/profile/about-avatar-trigger'
import { PageHeader } from '@/components/layout/page-header'
import { isSafeImageSrc, isValidHref } from '@/lib/utils'

// 动态渲染：避免 Docker 构建时用空模板库预渲染的页面在重启后被当作旧缓存返回
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '关于我',
  description: '了解站点作者与联系方式。',
  alternates: {
    canonical: '/about',
  },
}

function lines(raw: string | undefined) {
  return (raw || '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
}

export default async function AboutPage() {
  const [
    ownerName,
    defaultAvatarUrl,
    role,
    location,
    joinedYear,
    bio,
    techStack,
    hobbies,
    contactIntro,
    contactEmail,
    contactGithub,
    contactX,
    contactBilibili,
    contactQQ,
    showSocialGithub,
    showSocialX,
    showSocialBilibili,
    showSocialEmail,
    showSocialQQ,
  ] = await Promise.all([
    getSetting<string>('site.ownerName', ''),
    getSetting<string>('site.defaultAvatarUrl', ''),
    getSetting<string>('profile.role', ''),
    getSetting<string>('profile.location', ''),
    getSetting<string>('profile.joinedYear', ''),
    getSetting<string>('profile.bio', ''),
    getSetting<string>('profile.techStack', ''),
    getSetting<string>('profile.hobbies', ''),
    getSetting<string>('profile.contactIntro', ''),
    getSetting<string>('profile.contactEmail', ''),
    getSetting<string>('profile.contactGithub', ''),
    getSetting<string>('profile.contactX', ''),
    getSetting<string>('profile.contactBilibili', ''),
    getSetting<string>('profile.contactQQ', ''),
    getSetting<boolean>('profile.social.github.enabled', true),
    getSetting<boolean>('profile.social.x.enabled', true),
    getSetting<boolean>('profile.social.bilibili.enabled', true),
    getSetting<boolean>('profile.social.email.enabled', true),
    getSetting<boolean>('profile.social.qq.enabled', true),
  ])

  const name = (ownerName || '').trim()
  const contacts = [
    Boolean(contactEmail) && (showSocialEmail ?? true) && isValidHref(`mailto:${contactEmail}`)
      ? { label: 'Email', value: contactEmail!, href: `mailto:${contactEmail}`, icon: Mail }
      : null,
    (showSocialGithub ?? true) && isValidHref(contactGithub)
      ? { label: 'GitHub', value: contactGithub!, href: contactGithub!, icon: Github }
      : null,
    (showSocialX ?? true) && isValidHref(contactX)
      ? { label: 'X', value: contactX!, href: contactX!, icon: X }
      : null,
    (showSocialBilibili ?? true) && isValidHref(contactBilibili)
      ? { label: 'Bilibili', value: contactBilibili!, href: contactBilibili!, icon: Tv }
      : null,
    Boolean(contactQQ) && (showSocialQQ ?? true) && /^\d{5,12}$/.test(contactQQ || '')
      ? {
          label: 'QQ',
          value: contactQQ!,
          href: `https://wpa.qq.com/msgrd?v=3&uin=${contactQQ}&site=qq&menu=yes`,
          icon: MessageSquareHeart,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  const bioParagraphs = lines(bio)
  const hobbyItems = lines(hobbies)
  const skillGroups = lines(techStack)
    .map((line) => {
      const idx = line.search(/[:：]/)
      const items = (idx > 0 ? line.slice(idx + 1) : line)
        .split(/[,，、]/)
        .map((i) => i.trim())
        .filter(Boolean)
      return { title: idx > 0 ? line.slice(0, idx).trim() : '', items }
    })
    .filter((group) => group.items.length > 0)

  // Split "A · B · C" style roles so each part wraps as a whole, never mid-word.
  const roleParts = (role || '')
    .split(/\s*[·•|｜/、]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  const sideBlocks = Number(skillGroups.length > 0) + Number(hobbyItems.length > 0) + 1

  return (
    <div className="page">
      <PageHeader eyebrow="About" title="关于我" />
      <section className="container page-body about">
        <aside className="card about__profile">
          <AboutAvatarTrigger>
            <span className="about__avatar">
              {isSafeImageSrc(defaultAvatarUrl) ? (
                <img src={defaultAvatarUrl} alt="" />
              ) : (
                <span>{Array.from(name || '我')[0]}</span>
              )}
            </span>
          </AboutAvatarTrigger>
          <div className="about__identity">
          {name && <h2>{name}</h2>}
          {roleParts.length > 0 && (
            <p className="about__role">
              {roleParts.map((part, idx) => (
                <span key={`${part}-${idx}`}>{part}</span>
              ))}
            </p>
          )}
          {(location || joinedYear) && (
            <ul className="about__facts">
              {location && (
                <li>
                  <MapPin size={14} aria-hidden="true" />
                  {location}
                </li>
              )}
              {joinedYear && (
                <li>
                  <Calendar size={14} aria-hidden="true" />
                  建站于 {joinedYear}
                </li>
              )}
            </ul>
          )}
          </div>
          {contacts.length > 0 && (
            <div className="about__socials">
              {contacts.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="icon-btn"
                  {...(href.startsWith('mailto:')
                    ? {}
                    : { target: '_blank', rel: 'noopener noreferrer' })}
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          )}
        </aside>

        <div className="about__main" data-blocks={sideBlocks}>
          <section className="card about__block about__block--wide">
            <h2>简介</h2>
            {bioParagraphs.length > 0 ? (
              bioParagraphs.map((p, idx) => <p key={idx}>{p}</p>)
            ) : (
              <p className="about__placeholder">站长还没有写自我介绍。可以在后台「系统设置 → 个人资料」中填写。</p>
            )}
          </section>

          {skillGroups.length > 0 && (
            <section className="card about__block">
              <h2>关注领域 / 技能</h2>
              <div className="about__skills">
                {skillGroups.map((group, idx) => (
                  <div key={`${group.title}-${idx}`}>
                    {group.title && <h3>{group.title}</h3>}
                    <ul>
                      {group.items.map((item) => (
                        <li key={item} className="chip">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hobbyItems.length > 0 && (
            <section className="card about__block">
              <h2>兴趣</h2>
              <ul className="about__list">
                {hobbyItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card about__block" id="contact">
            <h2>联系我</h2>
            <p>{contactIntro || '欢迎通过以下方式联系我。'}</p>
            {contacts.length > 0 ? (
              <ul className="about__contacts">
                {contacts.map(({ label, value, href, icon: Icon }) => (
                  <li key={label}>
                    <Icon size={16} aria-hidden="true" />
                    <span>{label}</span>
                    <a
                      href={href}
                      {...(href.startsWith('mailto:')
                        ? {}
                        : { target: '_blank', rel: 'noopener noreferrer' })}
                    >
                      {value.replace(/^https?:\/\/(www\.)?/, '')}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="about__placeholder">暂未公开联系方式。</p>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}
