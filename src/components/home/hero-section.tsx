import Link from 'next/link'
import { ArrowRight, Github, Mail, MapPin } from 'lucide-react'
import { isSafeImageSrc, isValidHref } from '@/lib/utils'

/** Flatten the optional "focus areas / skills" setting into a short chip list. */
export function parseSkillChips(raw: string, limit = 10) {
  const items = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const idx = line.search(/[:：]/)
      return (idx > 0 ? line.slice(idx + 1) : line).split(/[,，、/|｜]/)
    })
    .map((item) => item.trim())
    .filter(Boolean)
  return Array.from(new Set(items)).slice(0, limit)
}

function renderHeadline(headline: string, owner: string) {
  const at = owner ? headline.indexOf(owner) : -1
  if (at < 0) return headline
  return (
    <>
      {headline.slice(0, at)}
      <mark>{owner}</mark>
      {headline.slice(at + owner.length)}
    </>
  )
}

export function HeroSection({ settings = {} }: { settings?: Record<string, unknown> }) {
  const str = (key: string) =>
    typeof settings[key] === 'string' ? String(settings[key]).trim() : ''
  const owner = str('site.ownerName')
  const firstTitle = str('hero.typingTitles')
    .split(/[\n|｜]/)
    .map((line) => line.trim())
    .find(Boolean)
  const headline = firstTitle || (owner ? `你好，我是${owner}` : '你好，欢迎来到这里')
  const intro = str('hero.subtitle') || str('profile.tagline')
  const role = str('profile.role')
  const location = str('hero.location') || str('profile.location')
  const avatar = str('site.defaultAvatarUrl')
  const skills = parseSkillChips(str('profile.techStack'))
  const github = str('profile.contactGithub')
  const email = str('profile.contactEmail')
  const showEmail =
    Boolean(email) &&
    settings['profile.social.email.enabled'] !== false &&
    isValidHref(`mailto:${email}`)
  const showGithub = settings['profile.social.github.enabled'] !== false && isValidHref(github)
  const contactHref = showEmail ? `mailto:${email}` : '/about#contact'
  const initial = Array.from(owner || headline)[0] || '你'

  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="card hero__card">
        <div className="hero__avatar" aria-hidden="true">
          {isSafeImageSrc(avatar) ? <img src={avatar} alt="" /> : <span>{initial}</span>}
        </div>
        <div className="hero__copy">
          {(owner || role || location) && (
            <p className="hero__eyebrow">
              {owner && <strong>{owner}</strong>}
              {role && <span>{role}</span>}
              {location && (
                <span className="hero__location">
                  <MapPin size={14} aria-hidden="true" />
                  {location}
                </span>
              )}
            </p>
          )}
          <h1 id="hero-title" className="hero__title">
            {renderHeadline(headline, owner)}
          </h1>
          {intro && <p className="hero__intro">{intro}</p>}
          <div className="hero__actions">
            <Link href="/projects" className="btn btn--primary">
              看作品
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/posts" className="btn">
              读文章
            </Link>
            {contactHref.startsWith('mailto:') ? (
              <a href={contactHref} className="btn">
                <Mail size={16} aria-hidden="true" />
                联系我
              </a>
            ) : (
              <Link href={contactHref} className="btn">
                <Mail size={16} aria-hidden="true" />
                联系我
              </Link>
            )}
            {showGithub && (
              <a
                href={github}
                className="btn btn--icon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
            )}
          </div>
          {skills.length > 0 && (
            <ul className="hero__skills" aria-label="关注领域">
              {skills.map((skill) => (
                <li key={skill} className="chip">
                  {skill}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
