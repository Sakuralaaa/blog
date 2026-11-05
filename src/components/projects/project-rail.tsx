'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * A horizontally scrolling row of cards: swipe on touch screens, arrow buttons,
 * shift + wheel or the keyboard on desktop. Cards snap into place.
 */
export function ProjectRail({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setCanPrev(track.scrollLeft > 4)
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    update()
    track.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(track)
    return () => {
      track.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [update])

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0
    const step = card ? card.offsetWidth + gap : track.clientWidth * 0.8
    const perPage = Math.max(1, Math.floor((track.clientWidth + gap) / step))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({ left: direction * step * perPage, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className="project-rail" data-can-prev={canPrev || undefined} data-can-next={canNext || undefined}>
      <div
        ref={trackRef}
        className="project-rail__track"
        role="region"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            scrollByPage(1)
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault()
            scrollByPage(-1)
          }
        }}
      >
        {children}
      </div>
      <button
        type="button"
        className="btn btn--icon project-rail__arrow project-rail__arrow--prev"
        onClick={() => scrollByPage(-1)}
        disabled={!canPrev}
        aria-label="上一组作品"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn--icon project-rail__arrow project-rail__arrow--next"
        onClick={() => scrollByPage(1)}
        disabled={!canNext}
        aria-label="下一组作品"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
