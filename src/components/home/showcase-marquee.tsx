'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { isSafeImageSrc } from '@/lib/utils'

export interface ShowcaseItem {
  key: string
  kind: 'work' | 'post'
  title: string
  subtitle: string | null
  image: string | null
  href: string
}

const SPEED = 32 // px per second
const RESUME_DELAY = 2500

/**
 * A full-width strip of tall cards (works and posts) that drifts slowly to the
 * left and loops forever. Hover, touch or keyboard focus pauses it, and it can
 * still be scrolled by hand (swipe, trackpad, shift + wheel). With reduced
 * motion it does not move on its own.
 */
export function ShowcaseMarquee({ items, label }: { items: ShowcaseItem[]; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || items.length === 0) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let paused = false
    let resumeTimer: ReturnType<typeof setTimeout> | undefined
    let last = performance.now()
    let carry = 0
    let frame = 0

    const half = () => track.scrollWidth / 2

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64)
      last = now
      if (!paused && !reduce.matches && !document.hidden) {
        carry += (SPEED * dt) / 1000
        const step = Math.floor(carry)
        if (step > 0) {
          carry -= step
          track.scrollLeft += step
        }
      }
      // Two copies of the list sit side by side; jump back by one copy to loop.
      const h = half()
      if (h > 0 && track.scrollLeft >= h) track.scrollLeft -= h
      frame = requestAnimationFrame(tick)
    }

    const pause = () => {
      paused = true
      if (resumeTimer) clearTimeout(resumeTimer)
    }
    const resumeLater = () => {
      if (resumeTimer) clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => {
        paused = false
      }, RESUME_DELAY)
    }
    const resumeNow = () => {
      if (resumeTimer) clearTimeout(resumeTimer)
      paused = false
    }

    track.addEventListener('pointerenter', pause)
    track.addEventListener('pointerleave', resumeNow)
    track.addEventListener('touchstart', pause, { passive: true })
    track.addEventListener('touchend', resumeLater, { passive: true })
    track.addEventListener('focusin', pause)
    track.addEventListener('focusout', resumeLater)
    track.addEventListener('wheel', () => {
      pause()
      resumeLater()
    }, { passive: true })

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      if (resumeTimer) clearTimeout(resumeTimer)
      track.removeEventListener('pointerenter', pause)
      track.removeEventListener('pointerleave', resumeNow)
      track.removeEventListener('touchstart', pause)
      track.removeEventListener('touchend', resumeLater)
      track.removeEventListener('focusin', pause)
      track.removeEventListener('focusout', resumeLater)
    }
  }, [items.length])

  if (items.length === 0) return null

  // Repeat short lists so one copy is always wider than the screen.
  const base = items.length < 6 ? [...items, ...items, ...items].slice(0, Math.max(6, items.length)) : items
  const loop = [...base.map((item, i) => ({ item, id: `a-${i}`, clone: i >= items.length })), ...base.map((item, i) => ({ item, id: `b-${i}`, clone: true }))]

  return (
    <div className="showcase" role="region" aria-label={label}>
      <div ref={trackRef} className="showcase__track">
        {loop.map(({ item, id, clone }, index) => (
          <ShowcaseCard key={`${item.key}-${id}`} item={item} clone={clone} eager={index < 6} tone={index % 6} />
        ))}
      </div>
    </div>
  )
}

function ShowcaseCard({ item, clone, eager, tone }: { item: ShowcaseItem; clone: boolean; eager: boolean; tone: number }) {
  const hasImage = isSafeImageSrc(item.image)
  return (
    <Link
      href={item.href}
      className="showcase-card"
      data-kind={item.kind}
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
    >
      {hasImage ? (
        <img src={item.image!} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
      ) : (
        <span className="showcase-card__fallback" data-tone={tone} aria-hidden="true">
          {item.title}
        </span>
      )}
      <span className="showcase-card__shade" aria-hidden="true" />
      <span className="showcase-card__info">
        <span className="showcase-card__kind">{item.kind === 'work' ? '作品' : '文章'}</span>
        <span className="showcase-card__title">{item.title}</span>
        {item.subtitle && <span className="showcase-card__subtitle">{item.subtitle}</span>}
      </span>
    </Link>
  )
}
